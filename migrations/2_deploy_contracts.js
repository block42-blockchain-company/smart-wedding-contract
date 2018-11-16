const SmartWeddingContract = artifacts.require("./contracts/SmartWeddingContract.sol");

const husbandAddress = "0x48ff344581827d855a27dd4ff0742dfc88b0de7a";
const wifeAddress = "0x2cce6e686960945f8eb6a392f7682e0d7e814d60";

module.exports = function(deployer) {
  deployer.deploy(SmartWeddingContract, husbandAddress, wifeAddress);
};
