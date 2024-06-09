import React, { useState } from 'react';
import {
  Button,
  DialogActions,
  DialogTitle,
  DialogContent,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import DialogForm from './DialogForm';
import { useWallet } from '../utils/wallet';
import { useUnlockedMnemonicAndSeed } from '../utils/wallet-seed';

export default function ExportAccountDialog({ open, onClose }) {
  const wallet = useWallet();
  const [isHidden, setIsHidden] = useState(true);
  const keyOutput = `[${Array.from(wallet.provider.account.secretKey)}]`;
  return (
    <DialogForm open={open} onClose={onClose} fullWidth>
      <DialogTitle>Export account</DialogTitle>
      <DialogContent>
        <TextField
          label="Private key"
          fullWidth
          type={isHidden && 'password'}
          variant="outlined"
          margin="normal"
          value={keyOutput}
        />
        <FormControlLabel
          control={
            <Switch
              checked={!isHidden}
              onChange={() => setIsHidden(!isHidden)}
            />
          }
          label="Reveal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </DialogForm>
  );
}

export function ExportMnemonicDialog({ open, onClose }) {
  const [isHidden, setIsHidden] = useState(true);
  const [mnemKey] = useUnlockedMnemonicAndSeed();
  return (
    <DialogForm open={open} onClose={onClose} fullWidth>
      <DialogTitle>Export mnemonic</DialogTitle>
      <DialogContent>
        <TextField
          label="Mnemonic"
          fullWidth
          type={isHidden && 'password'}
          variant="outlined"
          margin="normal"
          value={mnemKey.mnemonic}
        />
        <FormControlLabel
          control={
            <Switch
              checked={!isHidden}
              onChange={() => setIsHidden(!isHidden)}
            />
          }
          label="Reveal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </DialogForm>
  );
}
