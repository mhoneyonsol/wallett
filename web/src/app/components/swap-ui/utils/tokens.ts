// TODO: replace this whole file with something more modern. This is all copied
//       from sollet.

import { BN } from '@project-serum/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  AccountLayout,
} from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

export async function getOwnedAssociatedTokenAccounts(
  connection: Connection,
  publicKey: PublicKey
) {
  const filters = getOwnedAccountsFilters(publicKey);

  const resp = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    commitment: connection.commitment,
    dataSlice: { offset: 0, length: 0 },
    filters: filters,
  });

  const accs = resp
    .map(({ pubkey, account: { data, executable, owner, lamports } }: any) => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data,
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    }))
    .map(({ publicKey, accountInfo }: any) => {
      return { publicKey, account: parseTokenAccountData(accountInfo.data) };
    });

  return (
    (
      await Promise.all(
        accs.map(async (ta) => {
          const ata = await getAssociatedTokenAddress(
            ta.account.mint,
            publicKey,
            false,
            ASSOCIATED_TOKEN_PROGRAM_ID,
            TOKEN_PROGRAM_ID
          );
          return [ta, ata];
        })
      )
    )
      // @ts-ignore
      .filter(([ta, ata]) => ta.publicKey.equals(ata))
      // @ts-ignore
      .map(([ta]) => ta)
  );
}

export function parseTokenAccountData(data: Buffer) {
  const { mint, owner, amount } = AccountLayout.decode(data);

  return {
    mint: new PublicKey(mint),
    owner: new PublicKey(owner),
    amount: new BN(amount),
  };
}

function getOwnedAccountsFilters(publicKey: PublicKey) {
  const offset = AccountLayout.offsetOf('owner');
  const pubkey = new PublicKey(publicKey);
  if (offset) {
    return [
      {
        memcmp: {
          offset,
          bytes: pubkey.toBase58(),
        },
      },
      {
        dataSize: AccountLayout.span,
      },
    ];
  }
}
