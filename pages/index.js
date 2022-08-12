import React, { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Product from "../components/Product";
// import HeadComponent from '../components/Head';

// Constants
const TWITTER_HANDLE = "nico_builds";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
export const IPFS_CID = "QmaEN3gTCQDXZhn6BQbxPxhe386HCUQyGokD7Wk5kD7mkV"
export const IPFS_LINK = `https://cloudflare-ipfs.com/ipfs/${IPFS_CID}`
export const IPFS_FILENAME = 'gge-1.png'

const App = () => {
  const { publicKey } = useWallet()
  const [products, setProducts] = useState([])

  useEffect(() => {
    if(publicKey) {
      fetch(`/api/fetchProducts`)
        .then(res => res.json())
        .then(data => {
          data[0].image_url = IPFS_LINK
          setProducts(data)
          console.log("Products:", data)
        })
    }
  }, [publicKey])

  // {/* <img src="https://media.giphy.com/media/eSwGh3YK54JKU/giphy.gif" alt="emoji" /> */}
  const renderNotConnectedContainer = () => (
    <div className="button-container">
      <WalletMultiButton className="cta-button connect-wallet-button" />
    </div>    
  );

  const renderItemBuyContainer = () => (
    <div className="products-container">
      {products.map(product => (
        <Product key={product.id} product={product} />
      ))}
    </div>
  )

  return (
    <div className="App">
      <div className="container">
        <header className="header-container">
          <p className="header"> 😳 Nico's Emoji Store 😈</p>
          <p className="sub-text">The only emoji store that accepts shitcoins</p>
        </header>

        <main>
          {/* We only render the connect button if public key doesn't exist */}
          {publicKey ? renderItemBuyContainer() : renderNotConnectedContainer()}

        </main>

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src="twitter-logo.svg" />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
