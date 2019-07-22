## Smart Wedding Contract 🤵👰

<div>
  <a href="#">
    <img src="https://img.shields.io/badge/language-solidity-brightgreen.svg" alt="Language" />
  </a>
  <a href="https://ropsten.etherscan.io/address/0xb586324bf62224b414849b9e77d4f57ed3f10dfe#code">
    <img src="https://img.shields.io/badge/contract-ropsten-orange.svg" alt="Ropsten" />
  </a>
  <a href="https://etherscan.io/address/0x6947335452cb7a452fc337c28cb0d597806c7672#code">
    <img src="https://img.shields.io/badge/contract-mainnet-brightgreen.svg" alt="Mainnet" />
  </a>
  <a href="https://block42.uber.space/smart-wedding-contract/">
    <img src="https://img.shields.io/badge/application-live-e91e63.svg" alt="Application" />
  </a>
  <a href="https://t.me/block42_crypto">
    <img src="https://img.shields.io/badge/chat-telegram-0088cc.svg" alt="Telegram" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  </a>
</div>

<br />

A smart marriage contract on Ethereum using Truffle, a plain HTML, JS + Bootstrap 4 frontend and Web3.

## Install

Make sure `npm`, `Truffle` and `Ganache` is installed on your machine. Use `npm` to download all project dependencies:

```
npm install
```

Also make sure you use `Truffle` with version `v4.1.15`:

```
npm install truffle@4
```

## Development

First create a new file called `secrets.js` in the root of the project directory. The privage keys are used by Truffle to deploy the contract.

```js
module.exports = {
  privateKeysPrivateTestnet: [
    "dd4e...fa41" // private testnet private key
  ],
  privateKeysRopstenTestnet: [
    "bc35...ffd6" // ropsten testnet private key
  ],
  privateKeysMainnet: [
    "ba1a...336e" // mainnet private key
  ],
  infuraApiKey: "f5db...da74" // infura api key
}
```

Make sure there is enough ETH on the wallet to cover deployment costs. Compile and deploy the smart contract to the private testnet using `Truffle`:

```
truffle deploy
```

If you only want to deploy a specific migration (e.g. to save gas):

```
truffle deploy -f <migration number> --to <migration number>
```

Start the web server:

```
npm run dev
```

## Usage

The smart contract is already deployed and can be found at:

### Ethereum Networks

#### Ropsten (Testnet)

```solidity
0xb586324bf62224b414849b9e77d4f57ed3f10dfe
```

👉 find it on [Etherscan](https://ropsten.etherscan.io/address/0xb586324bf62224b414849b9e77d4f57ed3f10dfe#code)

#### Mainnet (Live)

```solidity
0x6947335452cb7a452fc337c28cb0d597806c7672
```

👉 find it on [Etherscan](https://etherscan.io/address/0x6947335452cb7a452fc337c28cb0d597806c7672#code)

Feel free to install MetaMask and interact with the contract (as far as you are allowed to 😉).

### Assets

Assets are stored in an encrypted format on the blockchain to ensure privacy. Ethereum does not support encryption at the moment so `CryptoJS` is used to perform client side encryption/decryption. You can access the encrypted assets on the `Ropsten` testnet using the key: `block42`

## Licence

This project is licensed under the MIT license. For more information see LICENSE.md.

```
The MIT License

Copyright (c) 2019 block42 Blockchain Company GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
