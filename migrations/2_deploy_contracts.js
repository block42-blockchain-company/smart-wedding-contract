const SmartWeddingContract = artifacts.require("./contracts/SmartWeddingContract.sol");

const husbandAddress = require("../config.js").husbandAddress;
const wifeAddress = require("../config.js").wifeAddress;

module.exports = function(deployer) {
  deployer.deploy(SmartWeddingContract, husbandAddress, wifeAddress);
};
