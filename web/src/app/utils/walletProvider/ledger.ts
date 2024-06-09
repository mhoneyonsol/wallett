import TransportWebHid from '@ledgerhq/hw-transport-webhid';
import Transport from '@ledgerhq/hw-transport';
import {
  getPublicKey,
  solana_derivation_path,
  solana_ledger_sign_bytes,
  solana_ledger_sign_transaction,
  solana_ledger_confirm_public_key,
} from './ledger-core';
import { DERIVATION_PATH } from './localStorage';
import bs58 from 'bs58';
import { Transaction, PublicKey } from '@solana/web3.js';

let TRANSPORT: Transport | null = null;

export interface LedgerWalletProviderArgs {
  onDisconnect?: () => void;
  derivationPath?: string;
  account?: number;
  change?: number;
}

export class LedgerWalletProvider {
  private transport: Transport | null = null;
  private pubKey: PublicKey | null = null;
  private derivationPath: string;
  private account?: number;
  private change?: number;
  private onDisconnect: () => void;
  private solanaDerivationPath: Buffer;

  constructor(args?: LedgerWalletProviderArgs) {
    this.onDisconnect = (args && args.onDisconnect) || (() => {});
    this.derivationPath = args?.derivationPath || DERIVATION_PATH.bip44Change;
    this.account = args?.account;
    this.change = args?.change;
    this.solanaDerivationPath = solana_derivation_path(
      this.account,
      this.change,
      this.derivationPath
    );
  }

  init = async () => {
    if (TRANSPORT === null) {
      TRANSPORT = await TransportWebHid.create();
    }
    this.transport = TRANSPORT;
    this.pubKey = await getPublicKey(this.transport, this.solanaDerivationPath);
    this.transport.on('disconnect', this.onDisconnect);
    // this.listAddresses = async (walletCount: number) => {
    //   // TODO: read accounts from ledger
    //   return [this.pubKey];
    // };
    return this;
  };

  get publicKey() {
    return this.pubKey;
  }

  listAddresses = async (walletCount: number) => {
    // TODO: read accounts from ledger
    return [this.pubKey!];
  };

  signTransaction = async (transaction: Transaction) => {
    if (!this.transport || !this.solanaDerivationPath) {
      throw new Error('Transport or derivation path not initialized');
    }
    const sig_bytes = await solana_ledger_sign_transaction(
      this.transport,
      this.solanaDerivationPath,
      transaction
    );
    transaction.addSignature(this.publicKey!, sig_bytes);
    return transaction;
  };

  createSignature = async (message: Uint8Array) => {
    if (!this.transport || !this.solanaDerivationPath) {
      throw new Error('Transport or derivation path not initialized');
    }
    const messageBuffer = Buffer.from(message);
    const sig_bytes = await solana_ledger_sign_bytes(
      this.transport,
      this.solanaDerivationPath,
      messageBuffer
    );
    return bs58.encode(sig_bytes);
  };

  confirmPublicKey = async () => {
    if (!this.transport || !this.solanaDerivationPath) {
      throw new Error('Transport or derivation path not initialized');
    }
    return await solana_ledger_confirm_public_key(
      this.transport,
      this.solanaDerivationPath
    );
  };
}
