//import { pbkdf2 } from 'crypto';
import { randomBytes, secretbox } from 'tweetnacl';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import bs58 from 'bs58';
import { EventEmitter } from 'events';
import { isExtension } from './utils';
import { useEffect, useState } from 'react';

const bip32 = BIP32Factory(ecc);

export interface MnemonicAndSeed {
  mnemonic: string | null;
  seed: string | null;
  importsEncryptionKey?: Buffer | null;
  derivationPath?: string | null;
}

const EMPTY_MNEMONIC: MnemonicAndSeed = {
  mnemonic: null,
  seed: null,
  importsEncryptionKey: null,
  derivationPath: null,
};

export function normalizeMnemonic(mnemonic: string) {
  return mnemonic.trim().split(/\s+/g).join(' ');
}

export async function generateMnemonicAndSeed() {
  const bip39 = await import('bip39');
  const mnemonic = bip39.generateMnemonic(256);
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return { mnemonic, seed: Buffer.from(seed).toString('hex') };
}

export async function mnemonicToSeed(mnemonic: string) {
  const bip39 = await import('bip39');
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid seed words');
  }
  const seed = await bip39.mnemonicToSeed(mnemonic);
  return Buffer.from(seed).toString('hex');
}

async function getExtensionUnlockedMnemonic(): Promise<string | null> {
  if (!isExtension) {
    return null;
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        channel: 'sollet_extension_mnemonic_channel',
        method: 'get',
      },
      (response: string) => resolve(response)
    );
  });
}

let unlockedMnemonicAndSeed: Promise<MnemonicAndSeed> =
  (async (): Promise<MnemonicAndSeed> => {
    const unlockedExpiration = localStorage.getItem('unlockedExpiration');
    // Left here to clean up stored mnemonics from previous method
    if (unlockedExpiration && Number(unlockedExpiration) < Date.now()) {
      localStorage.removeItem('unlocked');
      localStorage.removeItem('unlockedExpiration');
    }
    const stored = JSON.parse(
      (await getExtensionUnlockedMnemonic()) ||
        sessionStorage.getItem('unlocked') ||
        localStorage.getItem('unlocked') ||
        'null'
    );
    if (stored === null) {
      return EMPTY_MNEMONIC;
    }
    return {
      importsEncryptionKey: deriveImportsEncryptionKey(stored.seed),
      ...stored,
    };
  })();

export const walletSeedChanged = new EventEmitter();

export function getUnlockedMnemonicAndSeed(): Promise<MnemonicAndSeed> {
  return unlockedMnemonicAndSeed;
}

// // returns [mnemonic, loading]
export function useUnlockedMnemonicAndSeed(): [MnemonicAndSeed, boolean] {
  const [currentUnlockedMnemonic, setCurrentUnlockedMnemonic] =
    useState<MnemonicAndSeed | null>(null);

  useEffect(() => {
    const handleChange = (data: MnemonicAndSeed) =>
      setCurrentUnlockedMnemonic(data);

    walletSeedChanged.addListener('change', handleChange);
    unlockedMnemonicAndSeed.then(setCurrentUnlockedMnemonic);

    return () => {
      walletSeedChanged.removeListener('change', handleChange);
    };
  }, []);

  return !currentUnlockedMnemonic
    ? [EMPTY_MNEMONIC, true]
    : [currentUnlockedMnemonic, false];
}

export function useHasLockedMnemonicAndSeed() {
  const [unlockedMnemonic, loading] = useUnlockedMnemonicAndSeed();

  return [!unlockedMnemonic.seed && !!localStorage.getItem('locked'), loading];
}

function setUnlockedMnemonicAndSeed(
  mnemonic: string | null,
  seed: string | null,
  importsEncryptionKey: Buffer | null,
  derivationPath: string | null
): void {
  const data: MnemonicAndSeed = {
    mnemonic,
    seed,
    importsEncryptionKey,
    derivationPath,
  };
  unlockedMnemonicAndSeed = Promise.resolve(data);
  walletSeedChanged.emit('change', data);
}

export async function storeMnemonicAndSeed(
  mnemonic: string,
  seed: string,
  password: string | undefined,
  derivationPath: string
) {
  const plaintext = JSON.stringify({ mnemonic, seed, derivationPath });
  if (password) {
    const salt = randomBytes(16);
    const kdf = 'pbkdf2';
    const iterations = 100000;
    const digest = 'SHA-256';
    const key = await deriveEncryptionKey(password, salt, iterations, digest);
    const nonce = randomBytes(secretbox.nonceLength);
    const encrypted = secretbox(Buffer.from(plaintext), nonce, key);
    localStorage.setItem(
      'locked',
      JSON.stringify({
        encrypted: bs58.encode(encrypted),
        nonce: bs58.encode(nonce),
        kdf,
        salt: bs58.encode(salt),
        iterations,
        digest,
      })
    );
    localStorage.removeItem('unlocked');
  } else {
    localStorage.setItem('unlocked', plaintext);
    localStorage.removeItem('locked');
  }
  sessionStorage.removeItem('unlocked');
  if (isExtension) {
    chrome.runtime.sendMessage({
      channel: 'sollet_extension_mnemonic_channel',
      method: 'set',
      data: '',
    });
  }
  const importsEncryptionKey = deriveImportsEncryptionKey(seed);
  if (importsEncryptionKey) {
    setUnlockedMnemonicAndSeed(
      mnemonic,
      seed,
      importsEncryptionKey,
      derivationPath
    );
  }
}

export async function loadMnemonicAndSeed(
  password: string,
  stayLoggedIn: boolean
) {
  const lockedData = localStorage.getItem('locked');
  if (!lockedData) {
    throw new Error('No locked mnemonic found');
  }
  const {
    encrypted: encodedEncrypted,
    nonce: encodedNonce,
    salt: encodedSalt,
    iterations,
    digest,
  } = JSON.parse(lockedData);

  const encrypted = bs58.decode(encodedEncrypted);
  const nonce = bs58.decode(encodedNonce);
  const salt = bs58.decode(encodedSalt);
  const key = await deriveEncryptionKey(password, salt, iterations, digest);
  const plaintext = secretbox.open(encrypted, nonce, key);
  if (!plaintext) {
    throw new Error('Incorrect password');
  }
  const decodedPlaintext = Buffer.from(plaintext).toString();
  const { mnemonic, seed, derivationPath } = JSON.parse(decodedPlaintext);
  if (stayLoggedIn) {
    if (isExtension) {
      chrome.runtime.sendMessage({
        channel: 'sollet_extension_mnemonic_channel',
        method: 'set',
        data: decodedPlaintext,
      });
    } else {
      sessionStorage.setItem('unlocked', decodedPlaintext);
    }
  }
  const importsEncryptionKey = deriveImportsEncryptionKey(seed);
  if (importsEncryptionKey) {
    setUnlockedMnemonicAndSeed(
      mnemonic,
      seed,
      importsEncryptionKey,
      derivationPath
    );
  }
  return { mnemonic, seed, derivationPath };
}

// async function deriveEncryptionKey(
//   password: string,
//   salt: Uint8Array,
//   iterations: number,
//   digest: string
// ): Promise<Uint8Array> {
//   // Convert password to ArrayBuffer
//   const enc = new TextEncoder();
//   const passwordBuffer = enc.encode(password);
//   return new Promise((resolve, reject) =>
//     pbkdf2(
//       password,
//       salt,
//       iterations,
//       secretbox.keyLength,
//       digest,
//       (err, key) => (err ? reject(err) : resolve(new Uint8Array(key)))
//     )
//   );
// }

async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  digest: string
): Promise<Uint8Array> {
  // Convert password to ArrayBuffer
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);

  // Import password as a key
  const key = await crypto.subtle.importKey(
    'raw', // raw format of the key - should be Uint8Array
    passwordBuffer,
    { name: 'PBKDF2' },
    false, // not extractable
    ['deriveBits']
  );

  // Use PBKDF2 to derive a key
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: digest,
    },
    key,
    256
  );

  return new Uint8Array(derivedBits);
}

export function lockWallet() {
  setUnlockedMnemonicAndSeed(null, null, null, null);
}

// // Returns the 32 byte key used to encrypt imported private keys.
function deriveImportsEncryptionKey(seed: string): Buffer | undefined {
  if (!seed) {
    return undefined;
  }

  const bufferSeed = Buffer.from(seed, 'hex');
  const derivedNode = bip32.fromSeed(bufferSeed).derivePath("m/10016'/0");

  return derivedNode.privateKey;
}
