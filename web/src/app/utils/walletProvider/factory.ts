import {
  LocalStorageWalletProvider,
  LocalStorageWalletProviderArgs,
} from './localStorage';
import { LedgerWalletProvider, LedgerWalletProviderArgs } from './ledger';
import { Keypair } from '@solana/web3.js';

export type WalletProviderType = 'local' | 'ledger';
export type Wallet_Provider =
  | LocalStorageWalletProvider
  | LedgerWalletProvider
  | undefined;

export interface WalletProviderFactoryArgs {
  onDisconnect?: () => void;
  derivationPath?: string;
  account?: Keypair;
  change?: number;
}

export class WalletProviderFactory {
  static getProvider(
    type: WalletProviderType,
    args: WalletProviderFactoryArgs
  ) {
    if (type === 'local') {
      return new LocalStorageWalletProvider(
        args as LocalStorageWalletProviderArgs
      );
    }

    if (type === 'ledger') {
      return new LedgerWalletProvider(args as LedgerWalletProviderArgs);
    }
  }
}
