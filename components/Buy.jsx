import React, { useState, useMemo, useEffect } from "react";
import { Keypair, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { findReference, FindReferenceError } from '@solana/pay';
import { InfinitySpin } from "react-loader-spinner";
import IPFSDownload from "./IpfsDownload";
import { addOrder, hasPurchased, fetchItem } from '../lib/api';
// import { IPFS_CID, IPFS_FILENAME } from "../pages";

const STATUS = {
  Initial: 'Initial',
  Submitted: 'Submitted',
  Paid: 'Paid',
};

export default function Buy({ itemID }) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const orderID = useMemo(() => Keypair.generate().publicKey, [])

  const [item, setItem] = useState(null); // IPFS hash & filename of the purchased item
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(STATUS.Initial); // Tracking transaction status

  const order = useMemo(
    () => ({
      buyer: publicKey.toString(),
      orderID: orderID.toString(),
      itemID: itemID,
    }),
    [publicKey, orderID, itemID]
  )

  useEffect(() => {
    console.log({item})
  }, [item])

  useEffect(() => {
    // Check if transaction was confirmed
    if (status === STATUS.Submitted) {
      setLoading(true);
      const interval = setInterval(async () => {
        try {
          // Look for our orderID on the blockchain
          const result = await findReference(connection, orderID);
          console.log("Finding tx reference", result.confirmationStatus);
          
          // If the transaction is confirmed or finalized, the payment was successful!
          if (result.confirmationStatus === "confirmed" || result.confirmationStatus === "finalized") {
            clearInterval(interval);
            setStatus(STATUS.Paid);
            setLoading(false);
            addOrder(order)
            // alert("Thank you for your purchase!");
            console.log("Thank you for your purchase!");
          }
        } catch (e) {
          if (e instanceof FindReferenceError) {
            return null;
          }
          console.error("Unknown error", e);
        } finally {
          setLoading(false);
        }
      }, 1000);
      
      return () => {
        clearInterval(interval);
      };
    }

    async function getItem(itemID) {
      const item = await fetchItem(itemID);
      setItem(item);
    }

    if (status === STATUS.Paid) {
      getItem(itemID);
    }
  }, [status]);

  useEffect(() => {
    // Check if this address has already purchased this item
    // If so, fetch the item and set paid to true
    // Async function to avoid blocking the UI
    async function checkPurchased() {
      const purchased = await hasPurchased(publicKey, itemID);
      if (purchased) {
        setStatus(STATUS.Paid);
        console.log("Address has already purchased this item!");
        const item = await fetchItem(itemID)
        setItem(item)
      }
    }
    checkPurchased();
  }, [publicKey, itemID]);

  // Fetch the transaction object from the server 
  const processTransaction = async () => {
    setLoading(true)
    const txResponse = await fetch('../api/createTransaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    })
    const txData = await txResponse.json()
    console.log({txData})

    // We create a transaction object
    const buffer = Buffer.from(txData.transaction, 'base64')
    const tx = Transaction.from(buffer)
    console.log({ tx })

    try {
      const txHash = await sendTransaction(tx, connection)
      console.log(`Transaction sent: https://solscan.io/tx/${txHash}?cluster=devnet`);
      // Even though this could fail, we're just going to set it to true for now
      setStatus(STATUS.Submitted)
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <div>
        <p>You need to connect your wallet to make transactions</p>
      </div>
    );
  }

  if (loading) {
    return <InfinitySpin color="gray" />;
  }

  return (
    <div>
      {status === STATUS.Paid ? (
        <IPFSDownload filename={item?.filename} hash={item?.hash}/>
      ) : (
        <button disabled={loading} className="buy-button" onClick={processTransaction}>
          Buy now
        </button>
      )}
    </div>
  );
}