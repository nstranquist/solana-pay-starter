import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddress, getMint } from "@solana/spl-token";
import BigNumber from "bignumber.js";
import products from "./products.json";

const usdcAddress = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr")
const sellerAddress = '4farctEvGPkB1rgT5brKD1uudxS194ciJF4kHgY681SR'
const sellerPublicKey = new PublicKey(sellerAddress);

const createTransaction = async (req, res, txType = 'SOL') => {
  try {
    // Extract the transaction data from the request body
    const { buyer, orderID, itemID } = req.body

    // If we don't have something we need, stop!
    if (!buyer) {
      return res.status(400).json({
        message: "Missing buyer address",
      });
    }

    if (!orderID) {
      return res.status(400).json({
        message: "Missing order ID",
      });
    }

    // Fetch item price from products.json using itemID
    const itemPrice = products.find((item) => item.id === itemID).price;

    if (!itemPrice) {
      return res.status(404).json({
        message: "Item not found. please check item ID",
      });
    }

    const bigAmount = BigNumber(itemPrice);
    const buyerPublicKey = new PublicKey(buyer);

    const network = WalletAdapterNetwork.Devnet;
    const endpoint = clusterApiUrl(network);
    const connection = new Connection(endpoint);

    const buyerUsdcAddress = await getAssociatedTokenAddress(usdcAddress, buyerPublicKey)
    const shopUsdcAddress = await getAssociatedTokenAddress(usdcAddress, sellerPublicKey)

    // A blockhash is sort of like an ID for a block. It lets you identify each block.
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const usdcMint = await getMint(connection, usdcAddress)

    const tx = new Transaction({
      recentBlockhash: blockhash,
      feePayer: buyerPublicKey
    })

    // For SOL transaction only:
    let transferInstruction;
    if(txType === 'SOL') {
      transferInstruction = SystemProgram.transfer({
        fromPubkey: buyerPublicKey,
        lamports: bigAmount.multipliedBy(LAMPORTS_PER_SOL).toNumber(),
        toPubkey: sellerPublicKey,
      })
    }
    else if (txType === 'USDC') {
      transferInstruction = createTransferCheckedInstruction(
        buyerUsdcAddress,
        usdcAddress, // address of the token we want to transfer
        shopUsdcAddress,
        buyerPublicKey,
        bigAmount.toNumber() * 10 ** (await usdcMint).decimals,
        usdcMint.decimals // the token could have any number of decimals
      )
    }
    else {
      return res.status(400).json({ message: 'Invalid tx type' });
    }

    transferInstruction.keys.push({
      pubkey: new PublicKey(orderID),
      isSigner: false,
      isWritable: false
    })

    tx.add(transferInstruction)

    // format transaction
    const serializedTransaction = tx.serialize({
      requireAllSignatures: false,
    })
    const base64 = serializedTransaction.toString("base64")

    res.status(200).json({
      transaction: base64
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error creating tx' })
  }
}

export default function handler(req, res) {
  if(req.method === 'POST') {
    createTransaction(req, res, 'USDC')
  }
  else {
    res.status(405).end()
  }
}