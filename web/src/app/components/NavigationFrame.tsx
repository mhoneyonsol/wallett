import React, { useState, useMemo, ReactNode, MouseEvent } from 'react';
import {
  Toolbar,
  AppBar,
  Typography,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Tooltip,
  Divider,
  Hidden,
  IconButton,
  Badge,
  Theme,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useConnectionConfig } from '../utils/connection';
import {
  clusterForEndpoint,
  getClusters,
  addCustomCluster,
  customClusterExists,
} from '../utils/clusters';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import ExitToApp from '@mui/icons-material/ExitToApp';
import AccountIcon from '@mui/icons-material/AccountCircle';
import UsbIcon from '@mui/icons-material/Usb';
import CodeIcon from '@mui/icons-material/Code';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import { MonetizationOn, OpenInNew } from '@mui/icons-material';
import SolanaIcon from './SolanaIcon';
import { useWalletSelector } from '../utils/wallet';
import DeleteMnemonicDialog from './DeleteMnemonicDialog';
import AddHardwareWalletDialog from './AddHarwareWalletDialog';
import { ExportMnemonicDialog } from './ExportAccountDialog.js';
// @ts-ignore
import AddCustomClusterDialog from './AddCustomClusterDialog.js';
import {
  isExtension,
  isExtensionPopup,
  useIsExtensionWidth,
} from '../utils/utils';
import ConnectionIcon from './ConnectionIcon';
import { useConnectedWallets } from '../utils/connected-wallets';
import { usePage } from '../utils/page';
import AddAccountDialog from './AddAccountDialog';

const useStyles = makeStyles()((theme: Theme) => {
  return {
    content: {
      flexGrow: 1,
      paddingBottom: theme.spacing(3),
      [theme.breakpoints.down('sm')]: {
        paddingTop: theme.spacing(3),
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
      },
    },
    title: {
      flexGrow: 1,
    },
    button: {
      marginLeft: theme.spacing(1),
    },
    menuItemIcon: {
      minWidth: 32,
    },
    badge: {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.text.primary,
      height: 16,
      width: 16,
    },
  };
});

export default function NavigationFrame({ children }: { children: ReactNode }) {
  const { classes } = useStyles();
  const isExtensionWidth = useIsExtensionWidth();
  return (
    <>
      <AppBar position="static">
        {!isExtension && (
          <div
            style={{
              textAlign: 'center',
              background: '#fafafa',
              color: 'black',
              paddingLeft: '24px',
              paddingRight: '24px',
              fontSize: '14px',
            }}
          >
            <Typography>
              Beware of sites attempting to impersonate sollet.io or other DeFi
              services.
            </Typography>
          </div>
        )}
        <Toolbar>
          <Typography variant="h6" className={classes.title} component="h1">
            {isExtensionWidth ? 'Sollet' : 'Solana SPL Token Wallet'}
          </Typography>
          <NavigationButtons />
        </Toolbar>
      </AppBar>
      <main className={classes.content}>{children}</main>
      {!isExtensionWidth && <Footer />}
    </>
  );
}

function NavigationButtons() {
  const isExtensionWidth = useIsExtensionWidth();
  const [page] = usePage();

  if (isExtensionPopup) {
    return null;
  }

  let elements: ReactNode[] = [];
  if (page === 'wallet') {
    elements = [
      isExtension && <ConnectionsButton />,
      <WalletSelector />,
      <NetworkSelector />,
    ];
  } else if (page === 'connections') {
    elements = [<WalletButton />];
  }

  if (isExtension && isExtensionWidth) {
    elements.push(<ExpandButton />);
  }

  return elements;
}

function ExpandButton() {
  const onClick = () => {
    window.open(chrome.extension.getURL('index.html'), '_blank');
  };

  return (
    <Tooltip title="Expand View">
      <IconButton color="inherit" onClick={onClick}>
        <OpenInNew />
      </IconButton>
    </Tooltip>
  );
}

function WalletButton() {
  const { classes } = useStyles();
  const setPage = usePage()[1];
  const onClick = () => setPage('wallet');

  return (
    <>
      <Hidden smUp>
        <Tooltip title="Wallet Balances">
          <IconButton color="inherit" onClick={onClick}>
            <MonetizationOn />
          </IconButton>
        </Tooltip>
      </Hidden>
      <Hidden xsDown>
        <Button color="inherit" onClick={onClick} className={classes.button}>
          Wallet
        </Button>
      </Hidden>
    </>
  );
}

function ConnectionsButton() {
  const { classes } = useStyles();
  const setPage = usePage()[1];
  const onClick = () => setPage('connections');
  const connectedWallets = useConnectedWallets();

  const connectionAmount = connectedWallets
    ? Object.keys(connectedWallets.connectedWallets).length
    : 0;

  return (
    <>
      <Hidden smUp>
        <Tooltip title="Manage Connections">
          <IconButton color="inherit" onClick={onClick}>
            <Badge
              badgeContent={connectionAmount}
              classes={{ badge: classes.badge }}
            >
              <ConnectionIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Hidden>
      <Hidden xsDown>
        <Badge
          badgeContent={connectionAmount}
          classes={{ badge: classes.badge }}
        >
          <Button color="inherit" onClick={onClick} className={classes.button}>
            Connections
          </Button>
        </Badge>
      </Hidden>
    </>
  );
}

function NetworkSelector() {
  const { endpoint, setEndpoint } = useConnectionConfig();
  const cluster = useMemo(() => clusterForEndpoint(endpoint), [endpoint]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [addCustomNetworkOpen, setCustomNetworkOpen] = useState<boolean>(false);
  const { classes } = useStyles();

  return (
    <>
      <AddCustomClusterDialog
        open={addCustomNetworkOpen}
        onClose={() => setCustomNetworkOpen(false)}
        onAdd={({ name, apiUrl }: any) => {
          addCustomCluster(name, apiUrl);
          setCustomNetworkOpen(false);
        }}
      />
      <Hidden xsDown>
        <Button
          color="inherit"
          onClick={(e: MouseEvent<HTMLButtonElement>) =>
            setAnchorEl(e.currentTarget as HTMLElement)
          }
          className={classes.button}
        >
          {cluster?.label ?? 'Network'}
        </Button>
      </Hidden>
      <Hidden smUp>
        <Tooltip title="Select Network" arrow>
          <IconButton
            color="inherit"
            onClick={(e: MouseEvent<HTMLButtonElement>) =>
              setAnchorEl(e.currentTarget as HTMLElement)
            }
          >
            <SolanaIcon />
          </IconButton>
        </Tooltip>
      </Hidden>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        //getContentAnchorEl={null}
      >
        {getClusters().map((cluster) => (
          <MenuItem
            key={cluster.apiUrl}
            onClick={() => {
              setAnchorEl(null);
              setEndpoint(cluster.apiUrl);
            }}
            selected={cluster.apiUrl === endpoint}
          >
            <ListItemIcon className={classes.menuItemIcon}>
              {cluster.apiUrl === endpoint ? (
                <CheckIcon fontSize="small" />
              ) : null}
            </ListItemIcon>
            {cluster.name === 'mainnet-beta-backup'
              ? 'Mainnet Beta Backup'
              : cluster.apiUrl}
          </MenuItem>
        ))}
        <MenuItem
          onClick={() => {
            setCustomNetworkOpen(true);
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}></ListItemIcon>
          {customClusterExists()
            ? 'Edit Custom Endpoint'
            : 'Add Custom Endpoint'}
        </MenuItem>
      </Menu>
    </>
  );
}

function WalletSelector() {
  const {
    accounts,
    derivedAccounts,
    hardwareWalletAccount,
    setHardwareWalletAccount,
    setWalletSelector,
    addAccount,
  } = useWalletSelector();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [addAccountOpen, setAddAccountOpen] = useState<boolean>(false);
  const [addHardwareWalletDialogOpen, setAddHardwareWalletDialogOpen] =
    useState<boolean>(false);
  const [deleteMnemonicOpen, setDeleteMnemonicOpen] = useState<boolean>(false);
  const [exportMnemonicOpen, setExportMnemonicOpen] = useState<boolean>(false);
  const { classes } = useStyles();

  if (accounts.length === 0) {
    return null;
  }
  return (
    <>
      <AddHardwareWalletDialog
        open={addHardwareWalletDialogOpen}
        onClose={() => setAddHardwareWalletDialogOpen(false)}
        onAdd={({ publicKey, derivationPath, account, change }: any) => {
          setHardwareWalletAccount({
            name: 'Hardware wallet',
            publicKey,
            importedAccount: publicKey.toString(),
            ledger: true,
            derivationPath,
            account,
            change,
          });
          setWalletSelector({
            walletIndex: undefined,
            importedPubkey: publicKey.toString(),
            ledger: true,
            derivationPath,
            account,
            change,
          });
        }}
      />
      <AddAccountDialog
        open={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onAdd={({ name, importedAccount }: any) => {
          addAccount({ name, importedAccount });
          setWalletSelector({
            walletIndex: importedAccount ? undefined : derivedAccounts.length,
            importedPubkey: importedAccount
              ? importedAccount.publicKey.toString()
              : undefined,
            ledger: false,
          });
          setAddAccountOpen(false);
        }}
      />
      <ExportMnemonicDialog
        open={exportMnemonicOpen}
        onClose={() => setExportMnemonicOpen(false)}
      />
      <DeleteMnemonicDialog
        open={deleteMnemonicOpen}
        onClose={() => setDeleteMnemonicOpen(false)}
      />
      <Hidden xsDown>
        <Button
          color="inherit"
          onClick={(e: MouseEvent<HTMLButtonElement>) =>
            setAnchorEl(e.currentTarget as HTMLElement)
          }
          className={classes.button}
        >
          Account
        </Button>
      </Hidden>
      <Hidden smUp>
        <Tooltip title="Select Account" arrow>
          <IconButton
            color="inherit"
            onClick={(e: MouseEvent<HTMLButtonElement>) =>
              setAnchorEl(e.currentTarget as HTMLElement)
            }
          >
            <AccountIcon />
          </IconButton>
        </Tooltip>
      </Hidden>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        //getContentAnchorEl={null}
      >
        {accounts.map((account: any) => (
          <AccountListItem
            account={account}
            classes={classes}
            setAnchorEl={setAnchorEl}
            setWalletSelector={setWalletSelector}
          />
        ))}
        {hardwareWalletAccount && (
          <>
            <Divider />
            <AccountListItem
              account={hardwareWalletAccount}
              classes={classes}
              setAnchorEl={setAnchorEl}
              setWalletSelector={setWalletSelector}
            />
          </>
        )}
        <Divider />
        <MenuItem onClick={() => setAddHardwareWalletDialogOpen(true)}>
          <ListItemIcon className={classes.menuItemIcon}>
            <UsbIcon fontSize="small" />
          </ListItemIcon>
          Import Hardware Wallet
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setAddAccountOpen(true);
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          Add Account
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setExportMnemonicOpen(true);
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <ImportExportIcon fontSize="small" />
          </ListItemIcon>
          Export Mnemonic
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setDeleteMnemonicOpen(true);
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <ExitToApp fontSize="small" />
          </ListItemIcon>
          {'Delete Mnemonic & Log Out'}
        </MenuItem>
      </Menu>
    </>
  );
}

const useFooterStyles = makeStyles()((theme) => {
  return {
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      margin: theme.spacing(2),
    },
  };
});

function Footer() {
  const { classes } = useFooterStyles();
  return (
    <footer className={classes.footer}>
      <Button
        variant="outlined"
        color="primary"
        component="a"
        target="_blank"
        rel="noopener"
        href="https://github.com/serum-foundation/spl-token-wallet"
        startIcon={<CodeIcon />}
      >
        View Source
      </Button>
    </footer>
  );
}

function AccountListItem({
  account,
  classes,
  setAnchorEl,
  setWalletSelector,
}: any) {
  return (
    <MenuItem
      key={account.address.toBase58()}
      onClick={() => {
        setAnchorEl(null);
        setWalletSelector(account.selector);
      }}
      selected={account.isSelected}
      component="div"
    >
      <ListItemIcon className={classes.menuItemIcon}>
        {account.isSelected ? <CheckIcon fontSize="small" /> : null}
      </ListItemIcon>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Typography>{account.name}</Typography>
        <Typography color="textSecondary">
          {account.address.toBase58()}
        </Typography>
      </div>
    </MenuItem>
  );
}
