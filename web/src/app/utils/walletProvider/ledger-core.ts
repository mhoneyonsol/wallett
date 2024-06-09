import { PublicKey, Transaction } from '@solana/web3.js';
import { DERIVATION_PATH } from './localStorage';
import bs58 from 'bs58';
import Transport from '@ledgerhq/hw-transport';

const INS_GET_PUBKEY = 0x05;
const INS_SIGN_MESSAGE = 0x06;

const P1_NON_CONFIRM = 0x00;
const P1_CONFIRM = 0x01;

const P2_EXTEND = 0x01;
const P2_MORE = 0x02;

const MAX_PAYLOAD = 255;

const LEDGER_CLA = 0xe0;

// interface DerivationPath {
//   bip44Change: string;
//   bip44: string;
//   bip44Root: string;
// }

/*
 * Helper for chunked send of large payloads
 */
async function solana_send(
  transport: Transport,
  instruction: number,
  p1: number,
  payload: Buffer
) {
  let p2 = 0;
  let payload_offset = 0;

  if (payload.length > MAX_PAYLOAD) {
    while (payload.length - payload_offset > MAX_PAYLOAD) {
      const buf = payload.subarray(
        payload_offset,
        payload_offset + MAX_PAYLOAD
      );
      payload_offset += MAX_PAYLOAD;
      console.log(
        'send',
        (p2 | P2_MORE).toString(16),
        buf.length.toString(16),
        buf
      );
      const reply = await transport.send(
        LEDGER_CLA,
        instruction,
        p1,
        p2 | P2_MORE,
        buf
      );
      if (reply.length !== 2) {
        throw new Error(
          'solana_send: Received unexpected reply payload, UnexpectedReplyPayload'
        );
      }
      p2 |= P2_EXTEND;
    }
  }

  const buf = payload.subarray(payload_offset);
  console.log('send', p2.toString(16), buf.length.toString(16), buf);
  const reply = await transport.send(LEDGER_CLA, instruction, p1, p2, buf);

  return reply.subarray(0, reply.length - 2);
}

const BIP32_HARDENED_BIT = (1 << 31) >>> 0;

function _harden(n: number) {
  return (n | BIP32_HARDENED_BIT) >>> 0;
}

export function solana_derivation_path(
  account?: number,
  change?: number,
  derivationPath: string = DERIVATION_PATH.bip44Change
) {
  const useAccount = account ?? 0;
  const useChange = change ?? 0;

  // derivationPath = derivationPath
  //   ? derivationPath
  //   : DERIVATION_PATH.bip44Change;

  if (derivationPath === DERIVATION_PATH.bip44Root) {
    const length = 2;
    const derivation_path = Buffer.alloc(1 + length * 4);
    let offset = 0;
    offset = derivation_path.writeUInt8(length, offset);
    offset = derivation_path.writeUInt32BE(_harden(44), offset); // Using BIP44
    derivation_path.writeUInt32BE(_harden(501), offset); // Solana's BIP44 path
    return derivation_path;
  } else if (derivationPath === DERIVATION_PATH.bip44) {
    const length = 3;
    const derivation_path = Buffer.alloc(1 + length * 4);
    let offset = 0;
    offset = derivation_path.writeUInt8(length, offset);
    offset = derivation_path.writeUInt32BE(_harden(44), offset); // Using BIP44
    offset = derivation_path.writeUInt32BE(_harden(501), offset); // Solana's BIP44 path
    derivation_path.writeUInt32BE(_harden(useAccount), offset);
    return derivation_path;
  } else if (derivationPath === DERIVATION_PATH.bip44Change) {
    const length = 4;
    const derivation_path = Buffer.alloc(1 + length * 4);
    let offset = 0;
    offset = derivation_path.writeUInt8(length, offset);
    offset = derivation_path.writeUInt32BE(_harden(44), offset); // Using BIP44
    offset = derivation_path.writeUInt32BE(_harden(501), offset); // Solana's BIP44 path
    offset = derivation_path.writeUInt32BE(_harden(useAccount), offset);
    derivation_path.writeUInt32BE(_harden(useChange), offset);
    return derivation_path;
  } else {
    throw new Error('Invalid derivation path');
  }
}

async function solana_ledger_get_pubkey(
  transport: Transport,
  derivation_path: Buffer
) {
  return solana_send(
    transport,
    INS_GET_PUBKEY,
    P1_NON_CONFIRM,
    derivation_path
  );
}

export async function solana_ledger_sign_transaction(
  transport: Transport,
  derivation_path: Buffer,
  transaction: Transaction
) {
  const msg_bytes = transaction.serializeMessage();
  return solana_ledger_sign_bytes(transport, derivation_path, msg_bytes);
}

export async function solana_ledger_sign_bytes(
  transport: Transport,
  derivation_path: Buffer,
  msg_bytes: Buffer
) {
  const num_paths = Buffer.alloc(1);
  num_paths.writeUInt8(1);
  const payload = Buffer.concat([num_paths, derivation_path, msg_bytes]);

  return solana_send(transport, INS_SIGN_MESSAGE, P1_CONFIRM, payload);
}

export async function getPublicKey(transport: Transport, path: Buffer) {
  let from_derivation_path;
  if (path) {
    from_derivation_path = path;
  } else {
    from_derivation_path = solana_derivation_path();
  }
  const from_pubkey_bytes = await solana_ledger_get_pubkey(
    transport,
    from_derivation_path
  );
  const from_pubkey_string = bs58.encode(from_pubkey_bytes);

  return new PublicKey(from_pubkey_string);
}

export async function solana_ledger_confirm_public_key(
  transport: Transport,
  derivation_path: Buffer
) {
  return await solana_send(
    transport,
    INS_GET_PUBKEY,
    P1_CONFIRM,
    derivation_path
  );
}
