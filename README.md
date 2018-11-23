## Smart Wedding Contract

<div>
  <a href="https://etherscan.io">
    <img src="https://img.shields.io/badge/contract-ropsten-orange.svg" alt="Chat" />
  </a>
  <a href="https://etherscan.io">
    <img src="https://img.shields.io/badge/contract-mainnet-brightgreen.svg" alt="Chat" />
  </a>
  <a href="https://block42.uber.space/smart-wedding-contract/">
    <img src="https://img.shields.io/badge/application-live-e91e63.svg" alt="Chat" />
  </a>
  <a href="https://t.me/block42_crypto">
    <img src="https://img.shields.io/badge/chat-telegram-0088cc.svg" alt="Chat" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  </a>
</div>

<br />

A marriage contract on Ethereum using Truffle, a plain HTML, JS + Bootstrap 4 frontend and Web3.

## Install

Make sure `npm`, `Truffle` and `Ganache` is installed on your machine. Use `npm` to download all project dependencies:

```
npm install
```

## Development

First create a new file called `secrets.js` in the root of the project directory. The `mnemonic` is used by Truffle to deploy the contract.

```js
module.exports = {
  mnemonic: "put your secret seed phrase here" // <-- you need to paste your e.g. MetaMask seed here
}
```

Compile and deploy the smart contract to the local testnet using `Truffle`:

```
truffle deploy
```

Then start the web server:

```
npm run dev
```

## Usage

The smart contract is already deployed and live on both the Ethereum mainnet and testnet:

#### Mainnet

```solidity
0x0
```

#### Testnet (Ropsten)

```solidity
0x0
```

Feel free to install MetaMask and interact with the contract (as far as you are allowed to 😉).

## Licence

This project is licensed under the MIT license. For more information see LICENSE.md.
