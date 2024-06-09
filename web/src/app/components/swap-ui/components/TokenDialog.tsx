import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { TokenInfo } from '@solana/spl-token-registry';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  Theme,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { TokenIcon } from './Swap';
import { useSwappableTokens } from '../context/TokenList';

const useStyles = makeStyles()((theme: Theme) => {
  return {
    dialogContent: {
      padding: 0,
    },
    textField: {
      marginBottom: '8px',
    },
    tab: {
      minWidth: '134px',
    },
    tabSelected: {
      color: theme.palette.primary.contrastText,
      fontWeight: 700,
      backgroundColor: theme.palette.primary.main,
      borderRadius: '10px',
    },
    tabIndicator: {
      opacity: 0,
    },
  };
});

export default function TokenDialog({
  open,
  onClose,
  setMint,
}: {
  open: boolean;
  onClose: () => void;
  setMint: (mint: PublicKey) => void;
}) {
  const [tabSelection, setTabSelection] = useState(0);
  const [tokenFilter, setTokenFilter] = useState('');
  const filter = tokenFilter.toLowerCase();
  const { classes } = useStyles();
  const { swappableTokens, swappableTokensSollet, swappableTokensWormhole } =
    useSwappableTokens();
  const displayTabs = !useMediaQuery('(max-width:450px)');
  const selectedTokens =
    tabSelection === 0
      ? swappableTokens
      : tabSelection === 1
      ? swappableTokensWormhole
      : swappableTokensSollet;
  const tokens =
    tokenFilter === ''
      ? selectedTokens
      : selectedTokens.filter(
          (t) =>
            t.symbol.toLowerCase().startsWith(filter) ||
            t.name.toLowerCase().startsWith(filter) ||
            t.address.toLowerCase().startsWith(filter)
        );
  return (
    <Dialog
      open={open}
      onClose={onClose}
      scroll={'paper'}
      PaperProps={{
        style: {
          borderRadius: '10px',
          width: '420px',
        },
      }}
    >
      <DialogTitle style={{ fontWeight: 'bold' }}>
        <Typography variant="h6" style={{ paddingBottom: '16px' }}>
          Select a token
        </Typography>
        <TextField
          className={classes.textField}
          placeholder={'Search name'}
          value={tokenFilter}
          fullWidth
          variant="outlined"
          onChange={(e) => setTokenFilter(e.target.value)}
        />
      </DialogTitle>
      <DialogContent className={classes.dialogContent} dividers={true}>
        <List disablePadding>
          {tokens.map((tokenInfo: TokenInfo) => (
            <TokenListItem
              key={tokenInfo.address}
              tokenInfo={tokenInfo}
              onClick={(mint) => {
                setMint(mint);
                onClose();
              }}
            />
          ))}
        </List>
      </DialogContent>
      {displayTabs && (
        <DialogActions>
          <Tabs
            value={tabSelection}
            onChange={(e, v) => setTabSelection(v)}
            classes={{
              indicator: classes.tabIndicator,
            }}
          >
            <Tab
              value={0}
              className={classes.tab}
              classes={{ selected: classes.tabSelected }}
              label="Main"
            />
            <Tab
              value={1}
              className={classes.tab}
              classes={{ selected: classes.tabSelected }}
              label="Wormhole"
            />
            <Tab
              value={2}
              className={classes.tab}
              classes={{ selected: classes.tabSelected }}
              label="Sollet"
            />
          </Tabs>
        </DialogActions>
      )}
    </Dialog>
  );
}

function TokenListItem({
  tokenInfo,
  onClick,
}: {
  tokenInfo: TokenInfo;
  onClick: (mint: PublicKey) => void;
}) {
  const mint = new PublicKey(tokenInfo.address);
  return (
    <ListItem
      button
      onClick={() => onClick(mint)}
      style={{ padding: '10px 20px' }}
    >
      <TokenIcon mint={mint} style={{ width: '30px', borderRadius: '15px' }} />
      <TokenName tokenInfo={tokenInfo} />
    </ListItem>
  );
}

function TokenName({ tokenInfo }: { tokenInfo: TokenInfo }) {
  return (
    <div style={{ marginLeft: '16px' }}>
      <Typography style={{ fontWeight: 'bold' }}>
        {tokenInfo?.symbol}
      </Typography>
      <Typography color="textSecondary" style={{ fontSize: '14px' }}>
        {tokenInfo?.name}
      </Typography>
    </div>
  );
}
