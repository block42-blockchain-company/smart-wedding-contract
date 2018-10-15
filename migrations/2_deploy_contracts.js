const SmartWeddingContract = artifacts.require("./contracts/SmartWeddingContract.sol");

const husbandAddress = "0x5F29482aEe907075DCD88dffAF96dAa50229b02e";
const wifeAddress = "0x482f1A41ca69BcE106c484ec21CA726BE860Cf40";
const writtenContractIpfsId = "QmUW59mhd4DtmZNbwbZc9D5gAfX4GtEWZLeRq6hyKesJHa";

module.exports = function(deployer) {
  deployer.deploy(SmartWeddingContract, husbandAddress, wifeAddress, writtenContractIpfsId);
};
