import { PublicKey } from '@solana/web3.js';
import { AccountLayout, MintLayout } from '@solana/spl-token';

interface TokenAccountData {
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
}

interface MintData {
  decimals: number;
}

export function parseTokenAccountData(data: Buffer): TokenAccountData {
  const { mint, owner, amount } = AccountLayout.decode(data);
  return {
    mint: new PublicKey(mint),
    owner: new PublicKey(owner),
    amount,
  };
}

export function parseMintData(data: Buffer): MintData {
  const { decimals } = MintLayout.decode(data) as { decimals: number };
  return { decimals };
}

export function getOwnedAccountsFilters(publicKey: PublicKey) {
  const offset = AccountLayout.offsetOf('owner');
  if (offset) {
    return [
      {
        dataSize: AccountLayout.span,
      },
      {
        memcmp: {
          offset: offset,
          bytes: publicKey.toBase58(),
        },
      },
    ];
  }
}
