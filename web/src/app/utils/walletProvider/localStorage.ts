import { getUnlockedMnemonicAndSeed } from '../wallet-seed';
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
import nacl from 'tweetnacl';
import { Keypair, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';

const bip32 = BIP32Factory(ecc);

export const DERIVATION_PATH = {
  deprecated: undefined,
  bip44: 'bip44',
  bip44Change: 'bip44Change',
  bip44Root: 'bip44Root', // Ledger only.
};

type DerivationPath = keyof typeof DERIVATION_PATH;

export interface LocalStorageWalletProviderArgs {
  account: Keypair;
}

export function getAccountFromSeed(
  seed: Buffer,
  walletIndex: number,
  dPath: DerivationPath = 'deprecated',
  accountIndex: number = 0
): Keypair {
  const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
  //return new Keypair(nacl.sign.keyPair.fromSeed(derivedSeed).secretKey);
  return Keypair.fromSeed(derivedSeed);
}

function deriveSeed(
  seed: Buffer,
  walletIndex: number,
  derivationPath: DerivationPath,
  accountIndex: number
): Uint8Array {
  switch (derivationPath) {
    case 'deprecated': {
      const path = `m/501'/${walletIndex}'/0/${accountIndex}`;
      return bip32.fromSeed(seed).derivePath(path).privateKey!;
    }
    case 'bip44': {
      const path44 = `m/44'/501'/${walletIndex}'`;
      return derivePath(path44, seed.toString('hex')).key;
    }
    case 'bip44Change': {
      const path44Change = `m/44'/501'/${walletIndex}'/0'`;
      return derivePath(path44Change, seed.toString('hex')).key;
    }
    default:
      throw new Error(`invalid derivation path: ${derivationPath}`);
  }
}

export class LocalStorageWalletProvider {
  private account: Keypair;
  public publicKey: string;
  public listAddresses:
    | ((
        walletCount: number
      ) => Promise<{ index: number; address: string; name: string | null }[]>)
    | undefined;
  constructor(args: LocalStorageWalletProviderArgs) {
    this.account = args.account;
    this.publicKey = this.account.publicKey.toBase58();
  }

  async init(): Promise<LocalStorageWalletProvider> {
    const { seed } = await getUnlockedMnemonicAndSeed();

    if (!seed) {
      throw new Error('Seed is null');
    }
    const seedBuffer = Buffer.from(seed, 'hex');
    this.listAddresses = async (walletCount: number) => {
      return [...Array(walletCount).keys()].map((walletIndex) => {
        const address = getAccountFromSeed(
          seedBuffer,
          walletIndex
        ).publicKey.toBase58();
        const name = localStorage.getItem(`name${walletIndex}`);
        return { index: walletIndex, address, name };
      });
    };

    return this;
  }

  async signTransaction(transaction: Transaction) {
    transaction.partialSign(this.account);
    return transaction;
  }

  createSignature(message: Uint8Array): string {
    return bs58.encode(nacl.sign.detached(message, this.account.secretKey));
  }
}
