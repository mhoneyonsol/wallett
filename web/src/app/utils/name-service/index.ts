import { PublicKey, Connection } from '@solana/web3.js';
import {
  getTwitterRegistry,
  getHashedNameSync,
  getNameAccountKeySync,
  NameRegistryState,
  //getFilteredProgramAccounts,
  NAME_PROGRAM_ID,
  //getDNSRecordAddress,
  resolve,
} from '@bonfida/spl-name-service';
import { useConnection } from '../connection';
// @ts-ignore
import { useWallet } from '../wallet';
// @ts-ignore
import BN from 'bn.js';
import { useAsyncData } from '../fetch-loop';
import tuple from 'immutable-tuple';

interface Name {
  name: string;
  nameKey: PublicKey;
}

// Address of the SOL TLD
export const SOL_TLD_AUTHORITY = new PublicKey(
  '58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'
);

export const PROGRAM_ID = new PublicKey(
  'jCebN34bUfdeUYJT13J1yG16XWQpt5PDx6Mse9GUqhR'
);

export const resolveTwitterHandle = async (
  connection: Connection,
  twitterHandle: string
): Promise<string | undefined> => {
  try {
    const registry = await getTwitterRegistry(connection, twitterHandle);
    return registry.owner.toBase58();
  } catch (err) {
    console.warn(`err`);
    return undefined;
  }
};

export const getNameKey = async (name: string, parent = SOL_TLD_AUTHORITY) => {
  const hashedDomainName = getHashedNameSync(name);
  const key = getNameAccountKeySync(hashedDomainName, undefined, parent);
  return key;
};

export const resolveDomainName = async (
  connection: Connection,
  domainName: string,
  parent?: PublicKey
): Promise<string | undefined> => {
  try {
    const owner = resolve(connection, domainName);
    return (await owner).toBase58();
  } catch (error) {
    console.warn(error);
    return undefined;
  }
  // const key = parent
  //   ? await getDNSRecordAddress(parent, domainName)
  //   : await getNameKey(domainName);
  // try {
  //   const registry = await NameRegistryState.retrieve(connection, key);
  //   return registry.owner.toBase58();
  // } catch (err) {
  //   console.warn(err);
  //   return undefined;
  // }
};

export async function findOwnedNameAccountsForUser(
  connection: Connection,
  userAccount: PublicKey
): Promise<PublicKey[]> {
  const filters = [
    {
      memcmp: {
        offset: 32,
        bytes: userAccount.toBase58(),
      },
    },
  ];
  // const accounts = await getFilteredProgramAccounts(
  //   connection,
  //   NAME_PROGRAM_ID,
  //   filters
  // );
  const accounts = await connection.getProgramAccounts(NAME_PROGRAM_ID, {
    dataSlice: { offset: 0, length: 0 },
    filters,
  });
  return accounts.map((a) => a.pubkey);
}

export async function performReverseLookup(
  connection: Connection,
  nameAccount: PublicKey
): Promise<string> {
  const [centralState] = PublicKey.findProgramAddressSync(
    [PROGRAM_ID.toBuffer()],
    PROGRAM_ID
  );
  const hashedReverseLookup = getHashedNameSync(nameAccount.toBase58());
  const reverseLookupAccount = getNameAccountKeySync(
    hashedReverseLookup,
    centralState
  );

  const name = await NameRegistryState.retrieve(
    connection,
    reverseLookupAccount
  );
  if (!name.registry.data) {
    throw new Error('Could not retrieve name data');
  }
  const nameLength = new BN(name.registry.data.subarray(0, 4), 'le').toNumber();
  return name.registry.data.subarray(4, 4 + nameLength).toString();
}

export const useUserDomains = () => {
  const wallet = useWallet();
  const connection = useConnection();
  const fn = async () => {
    const pubkey = new PublicKey(wallet.publickey);
    const domains = await findOwnedNameAccountsForUser(connection, pubkey);
    const names: Name[] = [];
    const fn = async (d: PublicKey) => {
      try {
        const name = await performReverseLookup(connection, d);
        names.push({ name: name, nameKey: d });
      } catch (err) {
        console.log(`Passing account ${d.toBase58()} - err ${err}`);
      }
    };
    const promises = domains.map((d) => fn(d));
    await Promise.allSettled(promises);
    return names.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  };
  const pubkey = new PublicKey(wallet.publicKey);
  return useAsyncData(fn, tuple('useUserDomain', pubkey.toBase58()));
};
