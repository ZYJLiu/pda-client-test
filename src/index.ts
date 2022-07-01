import { initializeKeypair } from "./initializeKeypair";
import web3 = require("@solana/web3.js");
import Dotenv from "dotenv";
Dotenv.config();
import * as borsh from "@project-serum/borsh";

let programId = new web3.PublicKey(
  "AEkd2FaVS1cozqGFUhv6ZgKHRRYq7Xffepu1fuDay4LH"
);

let connection = new web3.Connection(web3.clusterApiUrl("devnet"));

async function main() {
  let payer = await initializeKeypair(connection);
  await connection.requestAirdrop(payer.publicKey, web3.LAMPORTS_PER_SOL * 1);

  // const transactionSignature = await createReview(payer, "test", 1, "test");
  const transactionSignature = await createComment(payer, "test", "comment");

  console.log(
    `Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  );
}

main()
  .then(() => {
    console.log("Finished successfully");
  })
  .catch((error) => {
    console.error(error);
  });

export async function createReview(
  payer: web3.Keypair,
  title: string,
  rating: number,
  description: string
): Promise<web3.TransactionSignature> {
  const [pda] = await web3.PublicKey.findProgramAddress(
    [payer.publicKey.toBuffer(), Buffer.from(title)],
    programId
  );

  const [pda_counter] = await web3.PublicKey.findProgramAddress(
    [pda.toBuffer(), Buffer.from("comment")],
    programId
  );

  const borshInstructionSchema = borsh.struct([
    borsh.u8("variant"),
    borsh.str("title"),
    borsh.u8("rating"),
    borsh.str("description"),
  ]);

  const payload = {
    variant: 0,
    title: title,
    rating: rating,
    description: description,
  };

  const buffer = Buffer.alloc(1000);
  borshInstructionSchema.encode(payload, buffer);
  const data = buffer.slice(0, borshInstructionSchema.getSpan(buffer));

  const transaction = new web3.Transaction();

  const instruction = new web3.TransactionInstruction({
    keys: [
      {
        pubkey: payer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: pda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pda_counter,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: web3.SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    data: data,
    programId,
  });

  transaction.add(instruction);

  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );

  return transactionSignature;
}

export async function createComment(
  payer: web3.Keypair,
  title: string,
  comment: string
): Promise<web3.TransactionSignature> {
  const [pda] = await web3.PublicKey.findProgramAddress(
    [payer.publicKey.toBuffer(), Buffer.from(title)],
    programId
  );

  const [pda_counter] = await web3.PublicKey.findProgramAddress(
    [pda.toBuffer(), Buffer.from("comment")],
    programId
  );

  const count = await connection.getAccountInfo(pda_counter);
  console.log(count);

  // not working, error "TypeError: b.readUIntLE is not a function"
  const borshAccountSchema = borsh.struct([borsh.u8("counter")]);
  const counter = borshAccountSchema.decode(count);

  const [pda_comment] = await web3.PublicKey.findProgramAddress(
    [pda.toBuffer(), Buffer.from(counter)],
    programId
  );

  const borshInstructionSchema = borsh.struct([
    borsh.publicKey("review"),
    borsh.str("comment"),
  ]);

  const payload = {
    variant: 3,
    review: pda,
    comment: comment,
  };

  const buffer = Buffer.alloc(1000);
  borshInstructionSchema.encode(payload, buffer);
  const data = buffer.slice(0, borshInstructionSchema.getSpan(buffer));

  const transaction = new web3.Transaction();

  const instruction = new web3.TransactionInstruction({
    keys: [
      {
        pubkey: payer.publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: pda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pda_counter,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: pda_comment,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: web3.SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
    data: data,
    programId,
  });

  transaction.add(instruction);

  const transactionSignature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [payer]
  );

  return transactionSignature;
}
