const SmartWeddingContract = artifacts.require("./contracts/SmartWeddingContract.sol");

const husbandAddress = "0x7e5a6850e31Ed2d0914DE1D42E1eDA95ccCcedD5";
const wifeAddress = "0x616Cc96629627Fd5B901F00B1C72Bf33db69bc62";

module.exports = function(deployer) {
  deployer.deploy(SmartWeddingContract, husbandAddress, wifeAddress);
};
