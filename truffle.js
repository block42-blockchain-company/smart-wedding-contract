const HDWalletProvider = require("truffle-hdwallet-provider-privkey");

const infuraApiKey = require("./secrets.js").infuraApiKey;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration> to customize your Truffle configuration!
	networks: {
		development: {
			provider: function() {
				const privateKeys = require("./secrets.js").privateKeysPrivateTestnet;
				return new HDWalletProvider(privateKeys, "http://127.0.0.1:8545")
			},
			network_id: "*",
			gas: 5000000,
			gasPrice: 10000000000
		},
		ropsten: {
			provider: function() {
				const privateKeys = require("./secrets.js").privateKeysRopstenTestnet;
				return new HDWalletProvider(privateKeys, "https://ropsten.infura.io/v3/" + infuraApiKey)
			},
			network_id: "3",
			gas: 5000000,
			gasPrice: 50000000000
		},
		live: {
			provider: function() {
				const privateKeys = require("./secrets.js").privateKeysMainnet;
				return new HDWalletProvider(privateKeys, "https://mainnet.infura.io/v3/" + infuraApiKey)
			},
			network_id: "1",
			gas: 5000000,
			gasPrice: 10000000000
		}
	}
};
