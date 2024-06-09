import React, { Suspense, useState } from 'react';
import {
  List,
  ListItem,
  CssBaseline,
  useMediaQuery,
  ThemeProvider,
  unstable_createMuiStrictModeTheme as createMuiTheme,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { blue } from '@mui/material/colors';
import { SnackbarProvider } from 'notistack';
import LoadingIndicator from './components/LoadingIndicator';
import DialogForm from './components/DialogForm';
import NavigationFrame from './components/NavigationFrame';
import { ConnectionProvider } from './utils/connection';
import { useWallet, WalletProvider } from './utils/wallet.js';
import { ConnectedWalletsProvider } from './utils/connected-wallets';
import { isExtension } from './utils/utils';
// // @ts-ignore
// import PopupPage from './pages/PopupPage';
import LoginPage from './pages/LoginPage';
// // @ts-ignore
// import ConnectionsPage from './pages/ConnectionsPage';
// // @ts-ignore
import WalletPage from './pages/WalletPage.js';
import { PageProvider, usePage } from './utils/page';
import { TokenRegistryProvider } from './utils/tokens/names';

export function App() {
  // TODO: add toggle for dark mode
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: blue,
        },

        // TODO consolidate popup dimensions
        //ext: '450',
      }),
    [prefersDarkMode]
  );

  // // Disallow rendering inside an iframe to prevent clickjacking.
  if (window.self !== window.top) {
    return null;
  }

  let appElement = (
    <NavigationFrame>
      <Suspense fallback={<LoadingIndicator />}>
        <PageContents />
      </Suspense>
    </NavigationFrame>
  );

  if (isExtension) {
    appElement = (
      <ConnectedWalletsProvider>
        <PageProvider>{appElement}</PageProvider>
      </ConnectedWalletsProvider>
    );
  }

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ConnectionProvider>
          <TokenRegistryProvider>
            <SnackbarProvider maxSnack={5} autoHideDuration={8000}>
              <WalletProvider>{appElement}</WalletProvider>
            </SnackbarProvider>
          </TokenRegistryProvider>
        </ConnectionProvider>
      </ThemeProvider>
    </Suspense>
  );
}
function PageContents() {
  const wallet = useWallet();
  const [page] = usePage();
  const [showWalletSuggestion, setShowWalletSuggestion] = useState(true);
  const suggestionKey = 'private-irgnore-wallet-suggestion';
  const ignoreSuggestion = window.localStorage.getItem(suggestionKey);
  if (!wallet) {
    return (
      <>
        {!ignoreSuggestion && (
          <WalletSuggestionDialog
            open={showWalletSuggestion}
            onClose={() => setShowWalletSuggestion(false)}
            onIgnore={() => {
              window.localStorage.setItem(suggestionKey, 'true');
              setShowWalletSuggestion(false);
            }}
          />
        )}
        <LoginPage />
      </>
    );
  }
  if (window.opener) {
    //return <PopupPage opener={window.opener} />;
    return <div>Pop up page</div>;
  }
  if (page === 'wallet') {
    return <WalletPage />;
  } else if (page === 'connections') {
    // return <ConnectionsPage />;
    return <div>Connections page</div>;
  }
}

const useStyles = makeStyles()(() => {
  return {
    walletButton: {
      width: '100%',
      padding: '16px',
      '&:hover': {
        cursor: 'pointer',
      },
    },
  };
});

interface WalletSuggestionDialogProps {
  open: boolean;
  onClose: () => void;
  onIgnore: () => void;
}

function WalletSuggestionDialog({
  open,
  onClose,
  onIgnore,
}: WalletSuggestionDialogProps) {
  const { classes } = useStyles();
  return (
    <DialogForm open={open} onClose={onClose} fullWidth>
      <DialogTitle>Looking for a Wallet?</DialogTitle>
      <DialogContent>
        <Typography>
          For the best Solana experience, it is recommended to use{' '}
          <b>Backpack</b>
        </Typography>
        <List disablePadding style={{ marginTop: '16px' }}>
          <ListItem disablePadding style={{ padding: 0 }}>
            <div
              className={classes.walletButton}
              style={{ display: 'flex' }}
              onClick={() => {
                window.location.href = 'https://backpack.app/download';
              }}
            >
              <div>
                <img
                  alt=""
                  style={{ height: '39px' }}
                  src="https://github.com/coral-xyz/backpack/raw/master/assets/backpack.png"
                />
              </div>
              <div>
                <Typography
                  style={{
                    marginLeft: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    height: '39px',
                    fontWeight: 'bold',
                  }}
                >
                  Backpack
                </Typography>
              </div>
            </div>
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button type="submit" color="primary" onClick={onIgnore}>
          Ignore Future Dialog
        </Button>
        <Button type="submit" color="primary" onClick={onClose}>
          Ok
        </Button>
      </DialogActions>
    </DialogForm>
  );
}
