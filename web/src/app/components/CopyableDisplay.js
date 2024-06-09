import React, { useRef } from 'react';
import { TextField, DialogContent, IconButton, Dialog } from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CopyIcon from 'mdi-material-ui/ContentCopy';
import { useSnackbar } from 'notistack';
import QrcodeIcon from 'mdi-material-ui/Qrcode';
import QRCode from 'qrcode.react';

const useStyles = makeStyles()((theme) => {
  return {
    root: {
      display: 'flex',
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      alignItems: 'baseline',
    },
  };
});

export default function CopyableDisplay({
  value,
  label,
  autoFocus,
  qrCode,
  helperText,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const textareaRef = useRef();
  const { classes } = useStyles();
  const copyLink = () => {
    let textArea = textareaRef.current;
    if (textArea) {
      textArea.select();
      document.execCommand('copy');
      enqueueSnackbar(`Copied ${label}`, {
        variant: 'info',
        autoHideDuration: 2500,
      });
    }
  };

  return (
    <div className={classes.root}>
      <TextField
        inputRef={(ref) => (textareaRef.current = ref)}
        multiline
        autoFocus={autoFocus}
        value={value}
        readOnly
        onFocus={(e) => e.currentTarget.select()}
        className={classes.textArea}
        fullWidth
        helperText={helperText}
        label={label}
        spellCheck={false}
      />
      <IconButton onClick={copyLink}>
        <CopyIcon />
      </IconButton>
      {qrCode ? <Qrcode value={qrCode === true ? value : qrCode} /> : null}
    </div>
  );
}

const useQrCodeStyles = makeStyles()((theme) => {
  return {
    qrcodeContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: theme.spacing(2),
    },
  };
});

function Qrcode({ value }) {
  const [showQrcode, setShowQrcode] = React.useState(false);
  const { classes } = useQrCodeStyles();

  return (
    <>
      <IconButton onClick={() => setShowQrcode(true)}>
        <QrcodeIcon />
      </IconButton>
      <Dialog open={showQrcode} onClose={() => setShowQrcode(false)}>
        <DialogContent className={classes.qrcodeContainer}>
          <QRCode value={value} size={256} includeMargin />
        </DialogContent>
      </Dialog>
    </>
  );
}
