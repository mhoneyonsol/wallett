import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useConnection, useSolanaExplorerUrlSuffix } from './connection';
import Button from '@mui/material/Button';

interface SendTransactionOptions {
  onSuccess?: (signature: string) => void;
  onError?: (error: Error) => void;
}

export function useSendTransaction() {
  const connection = useConnection();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [sending, setSending] = useState<boolean>(false);

  async function sendTransaction(
    signaturePromise: Promise<string>,
    { onSuccess, onError }: SendTransactionOptions = {}
  ) {
    let id = enqueueSnackbar('Sending transaction...', {
      variant: 'info',
      persist: true,
    });
    setSending(true);
    try {
      const signature = await signaturePromise;
      closeSnackbar(id);
      id = enqueueSnackbar('Confirming transaction...', {
        variant: 'info',
        persist: true,
        action: <ViewTransactionOnExplorerButton signature={signature} />,
      });
      const latestBlockHash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });
      closeSnackbar(id);
      setSending(false);
      enqueueSnackbar('Transaction confirmed', {
        variant: 'success',
        autoHideDuration: 15000,
        action: <ViewTransactionOnExplorerButton signature={signature} />,
      });
      if (onSuccess) {
        onSuccess(signature);
      }
    } catch (e) {
      closeSnackbar(id);
      setSending(false);
      console.warn(e);
      enqueueSnackbar((e as Error).message, { variant: 'error' });
      if (onError) {
        onError(e as Error);
      }
    }
  }

  return [sendTransaction, sending];
}

function ViewTransactionOnExplorerButton({ signature }: { signature: string }) {
  const urlSuffix = useSolanaExplorerUrlSuffix();
  return (
    <Button
      color="inherit"
      component="a"
      target="_blank"
      rel="noopener"
      href={`https://solscan.io/tx/${signature}` + urlSuffix}
    >
      View on Solscan
    </Button>
  );
}

interface CallAsyncOptions<T> {
  progressMessage?: string;
  successMessage?: string;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export function useCallAsync() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  return async function callAsync<T>(
    promise: Promise<T>,
    {
      progressMessage = 'Submitting...',
      successMessage = 'Success',
      onSuccess,
      onError,
    }: CallAsyncOptions<T> = {}
  ) {
    const id = enqueueSnackbar(progressMessage, {
      variant: 'info',
      persist: true,
    });
    try {
      const result = await promise;
      closeSnackbar(id);
      if (successMessage) {
        enqueueSnackbar(successMessage, { variant: 'success' });
      }
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (e) {
      console.warn(e);
      closeSnackbar(id);
      enqueueSnackbar((e as Error).message, { variant: 'error' });
      if (onError) {
        onError(e as Error);
      }
    }
  };
}
