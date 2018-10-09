var SimpleStorage = artifacts.require("./contracts/SimpleStorage.sol");

module.exports = function(deployer) {
  deployer.deploy(SimpleStorage);
};
