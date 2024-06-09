import { Instruction } from '@coral-xyz/anchor';
import * as BufferLayout from '@solana/buffer-layout';
import { InitializeMintInstructionData } from '@solana/spl-token';
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112'
);

export const MEMO_PROGRAM_ID = new PublicKey(
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'
);

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
  0,
  BufferLayout.struct([
    BufferLayout.u8('decimals'),
    BufferLayout.blob(32, 'mintAuthority'),
    BufferLayout.u8('freezeAuthorityOption'),
    BufferLayout.blob(32, 'freezeAuthority'),
  ]),
  'initializeMint'
);
LAYOUT.addVariant(1, BufferLayout.struct([]), 'initializeAccount');
LAYOUT.addVariant(
  7,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'mintTo'
);
LAYOUT.addVariant(
  8,
  BufferLayout.struct([BufferLayout.nu64('amount')]),
  'burn'
);
LAYOUT.addVariant(9, BufferLayout.struct([]), 'closeAccount');
LAYOUT.addVariant(
  12,
  BufferLayout.struct([
    BufferLayout.nu64('amount'),
    BufferLayout.u8('decimals'),
  ]),
  'transferChecked'
);

const instructionMaxSpan = Math.max(
  ...Object.values(LAYOUT.registry).map((r) => r.span)
);

function encodeTokenInstructionData(instruction: Instruction) {
  const b = Buffer.alloc(instructionMaxSpan);
  const span = LAYOUT.encode(instruction, b);
  return b.subarray(0, span);
}

export function initializeMint({
  mint,
  decimals,
  mintAuthority,
  freezeAuthority,
}: any) {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      name: 'initializeMint',
      data: {
        decimals,
        mintAuthority: mintAuthority.toBuffer(),
        freezeAuthorityOption: !!freezeAuthority,
        freezeAuthority: (freezeAuthority || PublicKey.default).toBuffer(),
      },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function initializeAccount({
  account,
  mint,
  owner,
}: {
  account: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
}) {
  const keys = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      name: 'initializeAccount',
      data: {},
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function transferChecked({
  source,
  mint,
  destination,
  amount,
  decimals,
  owner,
}: {
  source: PublicKey;
  mint: PublicKey;
  destination: PublicKey;
  amount: number | bigint;
  decimals: number;
  owner: PublicKey;
}) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      name: 'transferChecked',
      data: { amount, decimals },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function mintTo({
  mint,
  destination,
  amount,
  mintAuthority,
}: {
  mint: PublicKey;
  destination: PublicKey;
  amount: number | bigint;
  mintAuthority: PublicKey;
}) {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: mintAuthority, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      name: 'mintTo',
      data: {
        amount,
      },
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function closeAccount({
  source,
  destination,
  owner,
}: {
  source: PublicKey;
  destination: PublicKey;
  owner: PublicKey;
}) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: true, isWritable: false },
  ];
  return new TransactionInstruction({
    keys,
    data: encodeTokenInstructionData({
      name: 'closeAccount',
      data: {},
    }),
    programId: TOKEN_PROGRAM_ID,
  });
}

export function memoInstruction(memo: string) {
  return new TransactionInstruction({
    keys: [],
    data: Buffer.from(memo, 'utf-8'),
    programId: MEMO_PROGRAM_ID,
  });
}

// class PublicKeyLayout extends BufferLayout.Blob {
//   constructor(property?: string) {
//     super(32, property);
//   }

//   decode(b: Uint8Array, offset: number = 0): PublicKey {
//     const buffer = super.decode(b, offset) as Uint8Array;
//     return new PublicKey(Buffer.from(buffer));
//   }
//   encode(src, b, offset) {
//     return super.encode(src.toBuffer(), b, offset);
//   }
// }

// function publicKeyLayout(property: string) {
//   return new PublicKeyLayout(property);
// }

// export const OWNER_VALIDATION_PROGRAM_ID = new PublicKey(
//   '4MNPdKu9wFMvEeZBMt3Eipfs5ovVWTJb31pEXDJAAxX5'
// );

// export const OWNER_VALIDATION_LAYOUT = BufferLayout.struct([
//   publicKeyLayout('account'),
// ]);

// export function encodeOwnerValidationInstruction(instruction) {
//   const b = Buffer.alloc(OWNER_VALIDATION_LAYOUT.span);
//   const span = OWNER_VALIDATION_LAYOUT.encode(instruction, b);
//   return b.subarray(0, span);
// }

// export function assertOwner({ account, owner }) {
//   const keys = [{ pubkey: account, isSigner: false, isWritable: false }];
//   return new TransactionInstruction({
//     keys,
//     data: encodeOwnerValidationInstruction({ account: owner }),
//     programId: OWNER_VALIDATION_PROGRAM_ID,
//   });
// }
