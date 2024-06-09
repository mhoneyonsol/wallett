import React, { useState } from 'react';
import {
  Tooltip,
  Popover,
  IconButton,
  DialogActions,
  Button,
} from '@mui/material';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import PopupState, { bindTrigger, bindPopover } from 'material-ui-popup-state';
import Swap from './swap-ui';
import { Provider } from '@project-serum/anchor';
import { TokenListContainer } from '@solana/spl-token-registry';
import { useTokenInfos } from '../utils/tokens/names';
import { useSendTransaction } from '../utils/notifications';
import { useWallet } from '../utils/wallet';
import { useConnection } from '../utils/connection';
import { useIsExtensionWidth } from '../utils/utils';
import DialogForm from './DialogForm';

export default function SwapButton({ size }) {
  const isExtensionWidth = useIsExtensionWidth();
  if (isExtensionWidth) {
    return <SwapButtonDialog size={size} />;
  } else {
    return <SwapButtonPopover size={size} />;
  }
}

function SwapButtonDialog({ size }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendTransaction] = useSendTransaction();
  const connection = useConnection();
  const wallet = useWallet();
  const tokenInfos = useTokenInfos();
  const tokenList = tokenInfos && new TokenListContainer(tokenInfos);
  const provider = new NotifyingProvider(connection, wallet, sendTransaction);
  return (
    <>
      <Tooltip title="Swap Tokens">
        <IconButton size={size} onClick={() => setDialogOpen(true)}>
          <SwapHoriz />
        </IconButton>
      </Tooltip>
      <DialogForm
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Swap
            provider={provider}
            tokenList={tokenList}
            containerStyle={{
              width: '100%',
              boxShadow: 'none',
            }}
          />
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogActions>
        </div>
      </DialogForm>
    </>
  );
}

function SwapButtonPopover({ size }) {
  const [sendTransaction] = useSendTransaction();
  const connection = useConnection();
  const wallet = useWallet();
  const tokenInfos = useTokenInfos();
  const tokenList = tokenInfos && new TokenListContainer(tokenInfos);
  const provider = new NotifyingProvider(connection, wallet, sendTransaction);
  return (
    tokenList && (
      <PopupState variant="popover">
        {(popupState) => (
          <div style={{ display: 'flex' }}>
            <Tooltip title="Swap Tokens">
              <IconButton {...bindTrigger(popupState)} size={size}>
                <SwapHoriz />
              </IconButton>
            </Tooltip>
            <Popover
              {...bindPopover(popupState)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              slotProps={{ style: { borderRadius: '10px' } }}
              disableRestoreFocus
              keepMounted
            >
              <Swap
                provider={provider}
                tokenList={tokenList}
                containerStyle={{ width: '432px' }}
              />
            </Popover>
          </div>
        )}
      </PopupState>
    )
  );
}

class NotifyingProvider extends Provider {
  constructor(connection, wallet, sendTransaction) {
    super(connection, wallet, {
      commitment: 'recent',
    });
    this.sendTransaction = sendTransaction;
  }

  async send(tx, signers, opts) {
    return new Promise((onSuccess, onError) => {
      this.sendTransaction(super.send(tx, signers, opts), {
        onSuccess,
        onError,
      });
    });
  }

  async sendAll(txs, opts) {
    const sendTransaction = this.sendTransaction.bind(this);

    return new Promise((resolve, reject) => {
      let txSigs = [];

      const processTx = async (index) => {
        if (index >= txs.length) {
          resolve(txSigs);
          return;
        }

        const tx = txs[index];
        try {
          const superSendResult = super.send(tx.tx, tx.signers, opts);
          const sig = await new Promise((onSuccess, onError) => {
            sendTransaction(superSendResult, {
              onSuccess,
              onError,
            });
          });
          txSigs.push(sig);
          processTx(index + 1);
        } catch (error) {
          reject(error);
        }
      };

      processTx(0);
    });
  }
}
