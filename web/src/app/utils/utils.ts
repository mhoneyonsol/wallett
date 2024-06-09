import { useCallback, useEffect, useRef, useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Keypair, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import base58 from 'bs58';

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useLocalStorageState<T>(
  key: string,
  defaultState: T
): [T, (newState: T | ((prevState: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const storedState = localStorage.getItem(key);
    if (storedState) {
      return JSON.parse(storedState);
    }
    return defaultState;
  });

  const setLocalStorageState = useCallback(
    (newState: T | ((prevState: T) => T)) => {
      const nextState =
        typeof newState === 'function'
          ? (newState as (prevState: T) => T)(state)
          : newState;
      setState(nextState);
      if (nextState === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(nextState));
      }
    },
    [state, key]
  );

  return [state, setLocalStorageState];
}

export function useEffectAfterTimeout(effect: () => void, timeout: number) {
  useEffect(() => {
    const handle = setTimeout(effect, timeout);
    return () => clearTimeout(handle);
  });
}

export function useListener(emitter: EventEmitter, eventName: string) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((i) => i + 1);
    emitter.on(eventName, listener);
    return () => {
      emitter.removeListener(eventName, listener);
    };
  }, [emitter, eventName]);
}

export function useRefEqual<T>(
  value: T,
  areEqual: (oldValue: T, newValue: T) => boolean
): T {
  const prevRef = useRef<T>(value);
  if (prevRef.current !== value && !areEqual(prevRef.current, value)) {
    prevRef.current = value;
  }
  return prevRef.current;
}

export function abbreviateAddress(address: PublicKey) {
  const base58 = address.toBase58();
  return base58.slice(0, 4) + '…' + base58.slice(base58.length - 4);
}

// TODO consolidate popup dimensions
export function useIsExtensionWidth() {
  return useMediaQuery('(max-width:450px)');
}

export const isExtension = window.location.protocol === 'chrome-extension:';

export const isExtensionPopup = isExtension && window.opener;

export const decodeAccount = (privateKey: string) => {
  try {
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKey)));
  } catch (_) {
    try {
      return Keypair.fromSecretKey(new Uint8Array(base58.decode(privateKey)));
    } catch (_) {
      return undefined;
    }
  }
};

// shorten the checksummed version of the input address to have 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
