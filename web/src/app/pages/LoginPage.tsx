import React, { useEffect, useState } from 'react';
import {
  generateMnemonicAndSeed,
  useHasLockedMnemonicAndSeed,
  loadMnemonicAndSeed,
  mnemonicToSeed,
  storeMnemonicAndSeed,
  normalizeMnemonic,
  MnemonicAndSeed,
} from '../utils/wallet-seed';
import {
  getAccountFromSeed,
  DERIVATION_PATH,
} from '../utils/walletProvider/localStorage';
import {
  Container,
  Card,
  CardContent,
  DialogActions,
  DialogContentText,
  DialogTitle,
  Typography,
  TextField,
  Checkbox,
  FormControl,
  FormControlLabel,
  CardActions,
  Button,
  Select,
  MenuItem,
  Link,
} from '@mui/material';
import LoadingIndicator from '../components/LoadingIndicator';
//import { BalanceListItem } from '../components/BalancesList.js';
import { useCallAsync } from '../utils/notifications';
import { validateMnemonic } from 'bip39';
import DialogForm from '../components/DialogForm';
import { PublicKey } from '@solana/web3.js';

export default function LoginPage() {
  const [restore, setRestore] = useState<boolean>(false);
  const [hasLockedMnemonicAndSeed, loading] = useHasLockedMnemonicAndSeed();

  if (loading) {
    return null;
  }

  return (
    <Container maxWidth="sm">
      {restore ? (
        <RestoreWalletForm goBack={() => setRestore(false)} />
      ) : (
        <>
          {hasLockedMnemonicAndSeed ? <LoginForm /> : <CreateWalletForm />}
          <br />
          <Link style={{ cursor: 'pointer' }} onClick={() => setRestore(true)}>
            Restore existing wallet
          </Link>
        </>
      )}
    </Container>
  );
}

function LoginForm() {
  const [password, setPassword] = useState<string>('');
  const [stayLoggedIn, setStayLoggedIn] = useState<boolean>(false);
  const callAsync = useCallAsync();

  const submit = () => {
    callAsync(loadMnemonicAndSeed(password, stayLoggedIn), {
      progressMessage: 'Unlocking wallet...',
      successMessage: 'Wallet unlocked',
    });
  };

  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      e.stopPropagation();
      submit();
    }
  };

  const setPasswordOnChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPassword(e.target.value);
  const toggleStayLoggedIn = (e: React.ChangeEvent<HTMLInputElement>) =>
    setStayLoggedIn(e.target.checked);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Unlock Wallet
        </Typography>
        <TextField
          variant="outlined"
          fullWidth
          margin="normal"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPasswordOnChange}
          onKeyDown={submitOnEnter}
        />
        <FormControlLabel
          control={
            <Checkbox checked={stayLoggedIn} onChange={toggleStayLoggedIn} />
          }
          label="Keep wallet unlocked"
        />
      </CardContent>
      <CardActions style={{ justifyContent: 'flex-end' }}>
        <Button color="primary" onClick={submit}>
          Unlock
        </Button>
      </CardActions>
    </Card>
  );
}

function CreateWalletForm() {
  const [mnemonicAndSeed, setMnemonicAndSeed] =
    useState<MnemonicAndSeed | null>(null);
  const [savedWords, setSavedWords] = useState<boolean>(false);
  const callAsync = useCallAsync();

  useEffect(() => {
    generateMnemonicAndSeed().then(setMnemonicAndSeed);
  }, []);

  function submit(password: string) {
    if (!mnemonicAndSeed) {
      throw new Error('Mnemonic and seed are not generated yet');
    }
    const { mnemonic, seed } = mnemonicAndSeed;

    if (mnemonic && seed) {
      callAsync(
        storeMnemonicAndSeed(
          mnemonic,
          seed,
          password,
          DERIVATION_PATH.bip44Change
        ),
        {
          progressMessage: 'Creating wallet...',
          successMessage: 'Wallet created',
        }
      );
    }
  }

  if (!savedWords) {
    return (
      <SeedWordsForm
        mnemonic={mnemonicAndSeed ? mnemonicAndSeed.mnemonic : ''}
        goForward={() => setSavedWords(true)}
      />
    );
  }

  return (
    <ChoosePasswordForm
      //mnemonicAndSeed={mnemonicAndSeed}
      goBack={() => setSavedWords(false)}
      onSubmit={submit}
    />
  );
}

function SeedWordsForm({
  mnemonic,
  goForward,
}: {
  mnemonic: string | null;
  goForward: () => void;
}) {
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [seedCheck, setSeedCheck] = useState<string>('');

  const downloadMnemonic = (mnemonic: string) => {
    const url = window.URL.createObjectURL(new Blob([mnemonic]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sollet.bak');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Create New Wallet
          </Typography>
          <Typography paragraph>
            Create a new wallet to hold Solana and SPL tokens.
          </Typography>
          <Typography>
            Please write down the following twenty four words and keep them in a
            safe place:
          </Typography>
          {mnemonic ? (
            <TextField
              variant="outlined"
              fullWidth
              multiline
              margin="normal"
              value={mnemonic}
              label="Seed Words"
              onFocus={(e) => e.currentTarget.select()}
            />
          ) : (
            <LoadingIndicator />
          )}
          <Typography paragraph>
            Your private keys are only stored on your current computer or
            device. You will need these words to restore your wallet if your
            browser's storage is cleared or your device is damaged or lost.
          </Typography>
          <Typography paragraph>
            By default, sollet will use <code>m/44'/501'/0'/0'</code> as the
            derivation path for the main wallet. To use an alternative path, try
            restoring an existing wallet.
          </Typography>
          <Typography paragraph>
            <b>Note:</b> For certain users, Sollet may <b>NOT</b> be secure. See{' '}
            <a
              style={{ color: 'inherit' }}
              href="https://medium.com/metamask/security-notice-extension-disk-encryption-issue-d437d4250863"
              target="__blank"
            >
              this article
            </a>{' '}
            to understand if you are at risk.
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                disabled={!mnemonic}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
            }
            label="I have saved these words in a safe place."
          />
          <Typography paragraph>
            <Button
              variant="contained"
              color="primary"
              style={{ marginTop: 20 }}
              onClick={() => {
                downloadMnemonic(mnemonic ? mnemonic : '');
                setDownloaded(true);
              }}
            >
              Download Backup Mnemonic File (Required)
            </Button>
          </Typography>
        </CardContent>
        <CardActions style={{ justifyContent: 'flex-end' }}>
          <Button
            color="primary"
            disabled={!confirmed || !downloaded}
            onClick={() => setShowDialog(true)}
          >
            Continue
          </Button>
        </CardActions>
      </Card>
      <DialogForm
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSubmit={goForward}
        fullWidth
      >
        <DialogTitle>{'Confirm Mnemonic'}</DialogTitle>
        <DialogContentText style={{ margin: 20 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            Please re-enter your seed phrase to confirm that you have saved it.
          </div>
          <TextField
            label={`Please type your seed phrase to confirm`}
            fullWidth
            variant="outlined"
            margin="normal"
            value={seedCheck}
            onChange={(e) => setSeedCheck(e.target.value)}
          />
        </DialogContentText>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Close</Button>
          <Button
            type="submit"
            color="secondary"
            disabled={normalizeMnemonic(seedCheck) !== mnemonic}
          >
            Continue
          </Button>
        </DialogActions>
      </DialogForm>
    </>
  );
}

function ChoosePasswordForm({
  goBack,
  onSubmit,
}: {
  goBack: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Choose a Password (Optional)
        </Typography>
        <Typography>
          Optionally pick a password to protect your wallet.
        </Typography>
        <TextField
          variant="outlined"
          fullWidth
          margin="normal"
          label="New Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          variant="outlined"
          fullWidth
          margin="normal"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
        <Typography>
          If you forget your password you will need to restore your wallet using
          your seed words.
        </Typography>
      </CardContent>
      <CardActions style={{ justifyContent: 'space-between' }}>
        <Button onClick={goBack}>Back</Button>
        <Button
          color="primary"
          disabled={password !== passwordConfirm}
          onClick={() => onSubmit(password)}
        >
          Create Wallet
        </Button>
      </CardActions>
    </Card>
  );
}

function RestoreWalletForm({ goBack }: { goBack: () => void }) {
  const [rawMnemonic, setRawMnemonic] = useState<string>('');
  const [seed, setSeed] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [next, setNext] = useState<boolean>(false);

  const mnemonic = normalizeMnemonic(rawMnemonic);
  const isNextBtnEnabled =
    password === passwordConfirm && validateMnemonic(mnemonic);
  const displayInvalidMnemonic =
    validateMnemonic(mnemonic) === false && mnemonic.length > 0;
  return (
    <>
      {next ? (
        <DerivedAccounts
          goBack={() => setNext(false)}
          mnemonic={mnemonic}
          password={password}
          seed={seed}
        />
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Restore Existing Wallet
            </Typography>
            <Typography>
              Restore your wallet using your twelve or twenty-four seed words.
              Note that this will delete any existing wallet on this device.
            </Typography>
            <br />
            <Typography fontWeight="fontWeightBold">
              <b>Do not enter your hardware wallet seedphrase here.</b> Hardware
              wallets can be optionally connected after a web wallet is created.
            </Typography>
            {displayInvalidMnemonic && (
              <Typography fontWeight="fontWeightBold" style={{ color: 'red' }}>
                Mnemonic validation failed. Please enter a valid BIP 39 seed
                phrase.
              </Typography>
            )}
            <TextField
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              margin="normal"
              label="Seed Words"
              value={rawMnemonic}
              onChange={(e) => setRawMnemonic(e.target.value)}
            />
            <TextField
              variant="outlined"
              fullWidth
              margin="normal"
              label="New Password (Optional)"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              variant="outlined"
              fullWidth
              margin="normal"
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </CardContent>
          <CardActions style={{ justifyContent: 'space-between' }}>
            <Button onClick={goBack}>Cancel</Button>
            <Button
              color="primary"
              disabled={!isNextBtnEnabled}
              onClick={() => {
                mnemonicToSeed(mnemonic).then((seed) => {
                  setSeed(seed);
                  setNext(true);
                });
              }}
            >
              Next
            </Button>
          </CardActions>
        </Card>
      )}
    </>
  );
}

export enum DerivationPathMenuItemType {
  Deprecated = 0,
  Bip44 = 1,
  Bip44Change = 2,
  Bip44Root = 3,
}

function DerivedAccounts({
  goBack,
  mnemonic,
  seed,
  password,
}: {
  goBack: () => void;
  mnemonic: string;
  seed: string;
  password: string;
}) {
  const callAsync = useCallAsync();
  const [dPathMenuItem, setDPathMenuItem] =
    useState<DerivationPathMenuItemType>(DerivationPathMenuItem.Bip44Change);
  const accounts = [...Array(10)].map((_, idx) => {
    const derivationPath = toDerivationPath(dPathMenuItem);
    if (!derivationPath) {
      throw new Error('Invalid derivation path');
    }

    return getAccountFromSeed(Buffer.from(seed, 'hex'), idx, derivationPath);
  });

  function submit() {
    const derivationPath = toDerivationPath(dPathMenuItem);
    if (!derivationPath) {
      throw new Error('Invalid derivation path');
    }
    callAsync(storeMnemonicAndSeed(mnemonic, seed, password, derivationPath));
  }

  return (
    <Card>
      <AccountsSelector
        showDeprecated={true}
        accounts={accounts}
        dPathMenuItem={dPathMenuItem}
        setDPathMenuItem={setDPathMenuItem}
      />
      <CardActions style={{ justifyContent: 'space-between' }}>
        <Button onClick={goBack}>Back</Button>
        <Button color="primary" onClick={submit}>
          Restore
        </Button>
      </CardActions>
    </Card>
  );
}

interface AccountsSelectorProps {
  showRoot?: boolean;
  showDeprecated?: boolean;
  accounts: Array<{ publicKey: PublicKey }>;
  dPathMenuItem: DerivationPathMenuItemType;
  setDPathMenuItem: (value: DerivationPathMenuItemType) => void;
  onClick?: (account: { publicKey: PublicKey }) => void;
}

export function AccountsSelector({
  showRoot,
  showDeprecated,
  accounts,
  dPathMenuItem,
  setDPathMenuItem,
  onClick,
}: AccountsSelectorProps) {
  return (
    <CardContent>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" gutterBottom>
          Derivable Accounts
        </Typography>
        <FormControl variant="outlined">
          <Select
            value={dPathMenuItem}
            onChange={(e) => {
              setDPathMenuItem(e.target.value as DerivationPathMenuItemType);
            }}
          >
            {showRoot && (
              <MenuItem value={DerivationPathMenuItem.Bip44Root}>
                {`m/44'/501'`}
              </MenuItem>
            )}
            <MenuItem value={DerivationPathMenuItem.Bip44}>
              {`m/44'/501'/0'`}
            </MenuItem>
            <MenuItem value={DerivationPathMenuItem.Bip44Change}>
              {`m/44'/501'/0'/0'`}
            </MenuItem>
            {showDeprecated && (
              <MenuItem value={DerivationPathMenuItem.Deprecated}>
                {`m/501'/0'/0/0 (deprecated)`}
              </MenuItem>
            )}
          </Select>
        </FormControl>
      </div>
      {accounts.map((acc) => {
        return (
          <div
            key={acc.publicKey.toString()}
            onClick={onClick ? () => onClick(acc) : undefined}
          >
            {/* <BalanceListItem
              key={acc.publicKey.toString()}
              onClick={onClick ? () => onClick(acc) : undefined}
              publicKey={acc.publicKey}
              expandable={false}
            /> */}
            Balance list Item
          </div>
        );
      })}
    </CardContent>
  );
}

type DerivationPath = 'bip44' | 'bip44Change' | 'bip44Root' | 'deprecated';

// Material UI's Select doesn't render properly when using an `undefined` value,
// so we define this type and the subsequent `toDerivationPath` translator as a
// workaround.
//
// DERIVATION_PATH.deprecated is always undefined.
export const DerivationPathMenuItem = {
  Deprecated: 0,
  Bip44: 1,
  Bip44Change: 2,
  Bip44Root: 3, // Ledger only.
};

export function toDerivationPath(
  dPathMenuItem: DerivationPathMenuItemType
): DerivationPath | undefined {
  switch (dPathMenuItem) {
    case DerivationPathMenuItem.Deprecated:
      return 'deprecated';
    case DerivationPathMenuItem.Bip44:
      return 'bip44';
    case DerivationPathMenuItem.Bip44Change:
      return 'bip44Change';
    case DerivationPathMenuItem.Bip44Root:
      return 'bip44Root';
    default:
      return undefined;
  }
}
