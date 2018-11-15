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

const HDWalletProvider = require("truffle-hdwallet-provider");
const mnemonic = require("./secrets.js").mnemonic;
const infuraApiKey = require("./secrets.js").infuraApiKey;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
			provider: function() {
				return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545")
			},
      network_id: "*",
			gas: 5000000,
			gasPrice: 10000000000
    },
		ropsten: {
			provider: function() {
				return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/" + infuraApiKey)
			},
      network_id: "3",
			gas: 5000000,
			gasPrice: 10000000000
		}
  }
};
