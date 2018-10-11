const SmartWeddingContract = artifacts.require("SmartWeddingContract");

const husbandAddress = "0x5F29482aEe907075DCD88dffAF96dAa50229b02e";
const wifeAddress = "0x482f1A41ca69BcE106c484ec21CA726BE860Cf40";
const writtenContractIpfsId = "QmUW59mhd4DtmZNbwbZc9D5gAfX4GtEWZLeRq6hyKesJHa";

const otherAddress = "0x2a9bc43823F483E064519578877f159111198aE6";

contract('SmartWeddingContract', async (accounts) => {
  it("should add 10 eth to the smart contracts balance", async () => {
     let contract = await SmartWeddingContract.deployed();
     await contract.sendTransaction({ from: husbandAddress, value: web3.toWei(10) });
		 let balance = web3.eth.getBalance(contract.address);
		 assert(balance == web3.toWei(10));
  })

	it("should suggest a new asset", async () => {
     let contract = await SmartWeddingContract.deployed();
		 let assetIds = await contract.getAssetIds();
		 assert(assetIds.length == 0);
		 await contract.suggestAsset("any_asset_data", { from: husbandAddress });
		 assetIds = await contract.getAssetIds();
		 let latestAssetId = assetIds[assetIds.length - 1];
		 assert(latestAssetId == 1);
		 let latestAssetIndex = latestAssetId - 1;
		 let asset = await contract.assets(latestAssetIndex);
		 assert(asset[0] == "any_asset_data");
	 })

	 it("should add the suggested asset", async () => {
		 let contract = await SmartWeddingContract.deployed();
 		 let assetIds = await contract.getAssetIds();
 		 let latestAssetId = assetIds[assetIds.length - 1];
		 let latestAssetIndex = latestAssetId - 1;
 		 await contract.addAsset(latestAssetId, { from: wifeAddress });
 		 let asset = await contract.assets(latestAssetIndex);
 		 assert(asset[1] == true);
 	 })

	 it("should remove an asset", async () => {
		 let contract = await SmartWeddingContract.deployed();
 		 let assetIds = await contract.getAssetIds();
 		 let latestAssetId = assetIds[assetIds.length - 1];
		 let latestAssetIndex = latestAssetId - 1;
 		 await contract.removeAsset(latestAssetId, { from: husbandAddress });
		 await contract.removeAsset(latestAssetId, { from: wifeAddress });
 		 let asset = await contract.assets(latestAssetIndex);
 		 assert(asset[2] == true);
 	 })

	 it("should divorce", async () => {
		 let contract = await SmartWeddingContract.deployed();
 		 await contract.divorce({ from: husbandAddress });
		 assert(await contract.divorced() == false);
		 let husbandBalance = web3.fromWei(web3.eth.getBalance(husbandAddress));
		 let wifeBalance = web3.fromWei(web3.eth.getBalance(wifeAddress));
		 await contract.divorce({ from: wifeAddress });
 		 assert(await contract.divorced() == true);
		 let newHusbandBalance = web3.fromWei(web3.eth.getBalance(husbandAddress));
		 let newWifeBalance = web3.fromWei(web3.eth.getBalance(wifeAddress));
		 assert(newHusbandBalance > husbandBalance);
		 assert(newWifeBalance > wifeBalance);
 	 })
})
