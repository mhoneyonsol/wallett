import React, { ReactNode, useContext, useEffect, useMemo } from 'react';
import {
  AccountInfo,
  clusterApiUrl,
  Connection,
  PublicKey,
} from '@solana/web3.js';
import tuple from 'immutable-tuple';
import * as anchor from '@coral-xyz/anchor';
import { useLocalStorageState, useRefEqual } from './utils';
import { refreshCache, setCache, useAsyncData } from './fetch-loop';

interface ConnectionProviderProps {
  children: ReactNode;
}

const ConnectionContext = React.createContext<{
  endpoint: string;
  setEndpoint: (string: string) => void;
  connection: Connection;
} | null>(null);

export const MAINNET_URL =
  'https://black-red-diagram.solana-mainnet.quiknode.pro/8d9d8dd1ac14594b29ec452f8cd64a49087309e1/';
// No backup url for now. Leave the variable to not break wallets that
// have saved the url in their local storage, previously.
export const MAINNET_BACKUP_URL =
  'https://black-red-diagram.solana-mainnet.quiknode.pro/8d9d8dd1ac14594b29ec452f8cd64a49087309e1/';

export function ConnectionProvider({ children }: ConnectionProviderProps) {
  const [endpoint, setEndpoint] = useLocalStorageState(
    'connectionEndpoint',
    MAINNET_URL
  );

  const connection = useMemo(
    () => new Connection(endpoint, 'recent'),
    [endpoint]
  );

  return (
    <ConnectionContext.Provider value={{ endpoint, setEndpoint, connection }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): Connection {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('Missing connection context');
  }
  return context.connection;
}

export function useConnectionConfig() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('Missing connection context');
  }
  return { endpoint: context.endpoint, setEndpoint: context.setEndpoint };
}

export function useSolanaExplorerUrlSuffix() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('Missing connection context');
  }
  const endpoint = context.endpoint;
  if (endpoint === clusterApiUrl('devnet')) {
    return '?cluster=devnet';
  } else if (endpoint === clusterApiUrl('testnet')) {
    return '?cluster=testnet';
  }
  return '';
}

export function useAccountInfo(publicKey?: PublicKey) {
  const connection = useConnection();
  const cacheKey = tuple(connection, publicKey?.toBase58());
  const [accountInfo, loaded] = useAsyncData(
    async () => (publicKey ? connection.getAccountInfo(publicKey) : null),
    cacheKey
  );
  useEffect(() => {
    if (!publicKey) {
      return;
    }
    let previousInfo: AccountInfo<Buffer> | null = null;
    const id = connection.onAccountChange(publicKey, (info) => {
      if (
        !previousInfo ||
        !previousInfo.data.equals(info.data) ||
        previousInfo.lamports !== info.lamports
      ) {
        previousInfo = info;
        setCache(cacheKey, info);
      }
    });
    return () => {
      connection.removeAccountChangeListener(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, publicKey?.toBase58() ?? '', cacheKey]);
  return [
    useRefEqual(
      accountInfo,
      (oldInfo, newInfo) =>
        !!oldInfo &&
        !!newInfo &&
        oldInfo.data.equals(newInfo.data) &&
        oldInfo.lamports === newInfo.lamports
    ),
    loaded,
  ];
}

export function refreshAccountInfo(
  connection: Connection,
  publicKey: PublicKey,
  clearCache = false
) {
  const cacheKey = tuple(connection, publicKey.toBase58());
  refreshCache(cacheKey, clearCache);
}

export function setInitialAccountInfo(
  connection: Connection,
  publicKey: PublicKey,
  accountInfo: unknown
) {
  const cacheKey = tuple(connection, publicKey.toBase58());
  setCache(cacheKey, accountInfo, { initializeOnly: true });
}

export async function getMultipleSolanaAccounts(
  connection: Connection,
  publicKeys: PublicKey[]
): Promise<
  Array<null | { publicKey: PublicKey; account: AccountInfo<Buffer> }>
> {
  return anchor.utils.rpc.getMultipleAccounts(connection, publicKeys);
}
