/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() {
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>')
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 */

const HDWalletProviderMnemonic = require("truffle-hdwallet-provider");
const HDWalletProviderPrivateKey = require("truffle-hdwallet-provider-privkey");

const mnemonic = require("./secrets.js").mnemonic;
const privateKeys = require("./secrets.js").privateKeys;
const infuraApiKey = require("./secrets.js").infuraApiKey;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
			provider: function() {
				return new HDWalletProviderMnemonic(mnemonic, "http://127.0.0.1:8545")
			},
      network_id: "*",
			gas: 5000000,
			gasPrice: 10000000000
    },
		ropsten: {
			provider: function() {
				return new HDWalletProviderPrivateKey(privateKeys, "https://ropsten.infura.io/v3/" + infuraApiKey)
			},
      network_id: "3",
			gas: 5000000,
			gasPrice: 10000000000
		}
  }
};
