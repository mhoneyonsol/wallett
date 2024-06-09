import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { TokenInstructions } from '@project-serum/serum';
import {
  //assertOwner,
  closeAccount,
  initializeAccount,
  initializeMint,
  memoInstruction,
  mintTo,
  TOKEN_PROGRAM_ID,
  transferChecked,
} from './instructions';
import { getOwnedAccountsFilters } from './data';
import { AccountLayout, MintLayout } from '@solana/spl-token';

export async function getOwnedTokenAccounts(connection: any, publicKey: any) {
  const newPublicKey = new PublicKey(publicKey);
  const filters = getOwnedAccountsFilters(newPublicKey);
  const resp = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters,
  });
  return resp.map(
    ({ pubkey, account: { data, executable, owner, lamports } }: any) => ({
      publicKey: new PublicKey(pubkey),
      accountInfo: {
        data,
        executable,
        owner: new PublicKey(owner),
        lamports,
      },
    })
  );
}

export async function signAndSendTransaction(
  connection: any,
  transaction: any,
  wallet: any,
  signers: any,
  skipPreflight = false
) {
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash('max')
  ).blockhash;
  transaction.setSigners(
    // fee payed by the wallet owner
    wallet.publicKey,
    ...signers.map((s: any) => s.publicKey)
  );

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }

  transaction = await wallet.signTransaction(transaction);
  const rawTransaction = transaction.serialize();
  return await connection.sendRawTransaction(rawTransaction, {
    skipPreflight,
    preflightCommitment: 'single',
  });
}

export async function nativeTransfer(
  connection: any,
  wallet: any,
  destination: any,
  amount: any
) {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: destination,
      lamports: amount,
    })
  );
  return await signAndSendTransaction(connection, tx, wallet, []);
}

export async function createAndInitializeMint({
  connection,
  owner, // Wallet for paying fees and allowed to mint new tokens
  mint, // Account to hold token information
  amount, // Number of tokens to issue
  decimals,
  initialAccount, // Account to hold newly issued tokens, if amount > 0
}: any) {
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        MintLayout.span
      ),
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );
  transaction.add(
    initializeMint({
      mint: mint.publicKey,
      decimals,
      mintAuthority: owner.publicKey,
    })
  );
  const signers = [mint];
  if (amount > 0) {
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: owner.publicKey,
        newAccountPubkey: initialAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(
          AccountLayout.span
        ),
        space: AccountLayout.span,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    signers.push(initialAccount);
    transaction.add(
      initializeAccount({
        account: initialAccount.publicKey,
        mint: mint.publicKey,
        owner: owner.publicKey,
      })
    );
    transaction.add(
      mintTo({
        mint: mint.publicKey,
        destination: initialAccount.publicKey,
        amount,
        mintAuthority: owner.publicKey,
      })
    );
  }

  return await signAndSendTransaction(connection, transaction, owner, signers);
}

export async function createAndInitializeTokenAccount({
  connection,
  payer,
  mintPublicKey,
  newAccount,
}: any) {
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: newAccount.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        AccountLayout.span
      ),
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    })
  );
  transaction.add(
    initializeAccount({
      account: newAccount.publicKey,
      mint: mintPublicKey,
      owner: payer.publicKey,
    })
  );

  const signers = [newAccount];
  return await signAndSendTransaction(connection, transaction, payer, signers);
}

export async function createAssociatedTokenAccount({
  connection,
  wallet,
  splTokenMintAddress,
}: any) {
  const [ix, address] = await createAssociatedTokenAccountIx(
    wallet.publicKey,
    wallet.publicKey,
    splTokenMintAddress
  );
  const tx = new Transaction();
  tx.add(ix);
  tx.feePayer = wallet.publicKey;
  const txSig = await signAndSendTransaction(connection, tx, wallet, []);

  return [address, txSig];
}

async function createAssociatedTokenAccountIx(
  fundingAddress: any,
  walletAddress: any,
  splTokenMintAddress: any
): Promise<any> {
  const associatedTokenAddress = await findAssociatedTokenAddress(
    walletAddress,
    splTokenMintAddress
  );
  const systemProgramId = new PublicKey('11111111111111111111111111111111');
  const keys = [
    {
      pubkey: fundingAddress,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: systemProgramId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TokenInstructions.TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  const ix = new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
  return [ix, associatedTokenAddress];
}

export async function findAssociatedTokenAddress(
  walletAddress: any,
  tokenMintAddress: any
) {
  const pubkey = new PublicKey(walletAddress);
  return PublicKey.findProgramAddressSync(
    [
      pubkey.toBuffer(),
      TokenInstructions.TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
);

export async function transferTokens({
  connection,
  owner,
  sourcePublicKey,
  destinationPublicKey,
  amount,
  memo,
  mint,
  decimals,
  overrideDestinationCheck,
}: any) {
  let destinationAccountInfo = await connection.getAccountInfo(
    destinationPublicKey
  );
  if (
    !!destinationAccountInfo &&
    destinationAccountInfo.owner.equals(TOKEN_PROGRAM_ID)
  ) {
    return await transferBetweenSplTokenAccounts({
      connection,
      owner,
      mint,
      decimals,
      sourcePublicKey,
      destinationPublicKey,
      amount,
      memo,
    });
  }

  if (
    (!destinationAccountInfo || destinationAccountInfo.lamports === 0) &&
    !overrideDestinationCheck
  ) {
    throw new Error('Cannot send to address with zero SOL balances');
  }

  const destinationAssociatedTokenAddress = await findAssociatedTokenAddress(
    destinationPublicKey,
    mint
  );
  destinationAccountInfo = await connection.getAccountInfo(
    destinationAssociatedTokenAddress
  );
  if (
    !!destinationAccountInfo &&
    destinationAccountInfo.owner.equals(TOKEN_PROGRAM_ID)
  ) {
    return await transferBetweenSplTokenAccounts({
      connection,
      owner,
      mint,
      decimals,
      sourcePublicKey,
      destinationPublicKey: destinationAssociatedTokenAddress,
      amount,
      memo,
    });
  }
  return await createAndTransferToAccount({
    connection,
    owner,
    sourcePublicKey,
    destinationPublicKey,
    amount,
    memo,
    mint,
    decimals,
  });
}

function createTransferBetweenSplTokenAccountsInstruction({
  ownerPublicKey,
  mint,
  decimals,
  sourcePublicKey,
  destinationPublicKey,
  amount,
  memo,
}: any) {
  const transaction = new Transaction().add(
    transferChecked({
      source: sourcePublicKey,
      mint,
      decimals,
      destination: destinationPublicKey,
      owner: ownerPublicKey,
      amount,
    })
  );
  if (memo) {
    transaction.add(memoInstruction(memo));
  }
  return transaction;
}

async function transferBetweenSplTokenAccounts({
  connection,
  owner,
  mint,
  decimals,
  sourcePublicKey,
  destinationPublicKey,
  amount,
  memo,
}: any) {
  const transaction = createTransferBetweenSplTokenAccountsInstruction({
    ownerPublicKey: owner.publicKey,
    mint,
    decimals,
    sourcePublicKey,
    destinationPublicKey,
    amount,
    memo,
  });

  return await signAndSendTransaction(connection, transaction, owner, []);
}

async function createAndTransferToAccount({
  connection,
  owner,
  sourcePublicKey,
  destinationPublicKey,
  amount,
  memo,
  mint,
  decimals,
}: any) {
  const [createAccountInstruction, newAddress] =
    await createAssociatedTokenAccountIx(
      owner.publicKey,
      destinationPublicKey,
      mint
    );
  const transaction = new Transaction();
  // transaction.add(
  //   assertOwner({
  //     account: destinationPublicKey,
  //     owner: SystemProgram.programId,
  //   })
  // );
  transaction.add(createAccountInstruction);
  const transferBetweenAccountsTxn =
    createTransferBetweenSplTokenAccountsInstruction({
      ownerPublicKey: owner.publicKey,
      mint,
      decimals,
      sourcePublicKey,
      destinationPublicKey: newAddress,
      amount,
      memo,
    });
  transaction.add(transferBetweenAccountsTxn);

  return await signAndSendTransaction(connection, transaction, owner, []);
}

export async function closeTokenAccount({
  connection,
  owner,
  sourcePublicKey,
  skipPreflight,
}: any) {
  const transaction = new Transaction().add(
    closeAccount({
      source: sourcePublicKey,
      destination: owner.publicKey,
      owner: owner.publicKey,
    })
  );

  return await signAndSendTransaction(
    connection,
    transaction,
    owner,
    [],
    skipPreflight
  );
}
