const SmartWeddingContract = artifacts.require("./contracts/SmartWeddingContract.sol");

const husbandAddress = "0x48fF344581827d855A27Dd4FF0742dfC88b0DE7A";
const wifeAddress = "0x2CcE6E686960945F8Eb6a392F7682E0D7E814d60";

module.exports = function(deployer) {
  deployer.deploy(SmartWeddingContract, husbandAddress, wifeAddress);
};
