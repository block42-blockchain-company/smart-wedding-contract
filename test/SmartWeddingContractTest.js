const SmartWeddingContract = artifacts.require("SmartWeddingContract");

const husbandAddress = require("../config.js").husbandAddress;
const wifeAddress = require("../config.js").wifeAddress;

contract('SmartWeddingContract', async (accounts) => {
	it("should sign the contract by both spouses", async () => {
		const contract = await SmartWeddingContract.deployed();
		await contract.signContract({ from: husbandAddress });
		await contract.signContract({ from: wifeAddress });
		const signed = await contract.signed();
		assert(signed == true);
	})

  it("should pay in 10 eth (each) to the contract", async () => {
     let contract = await SmartWeddingContract.deployed();
     await contract.sendTransaction({ from: husbandAddress, value: web3.toWei(10) });
		 await contract.sendTransaction({ from: wifeAddress, value: web3.toWei(10) });
		 let balance = web3.eth.getBalance(contract.address);
		 assert(balance == web3.toWei(20));
  })

	it("should propose an asset", async () => {
     let contract = await SmartWeddingContract.deployed();
		 let assetIds = await contract.getAssetIds({ from: husbandAddress });
		 assert(assetIds.length == 0);
		 await contract.proposeAsset("new_asset", 60, 40, { from: husbandAddress });
		 assetIds = await contract.getAssetIds({ from: husbandAddress });
		 let latestAssetId = assetIds[assetIds.length - 1];
		 assert(latestAssetId == 1);
		 let latestAssetIndex = latestAssetId - 1;
		 let asset = await contract.assets(latestAssetIndex);
		 assert(asset[0] == "new_asset");
	 })

	 it("should approve the proposed asset", async () => {
		 let contract = await SmartWeddingContract.deployed();
 		 let assetIds = await contract.getAssetIds({ from: husbandAddress });
 		 let latestAssetId = assetIds[assetIds.length - 1];
		 let latestAssetIndex = latestAssetId - 1;
 		 await contract.approveAsset(latestAssetId, { from: wifeAddress });
 		 let asset = await contract.assets(latestAssetIndex);
 		 assert(asset[3] == true);
 	 })

	 it("should remove the asset", async () => {
		 let contract = await SmartWeddingContract.deployed();
 		 let assetIds = await contract.getAssetIds({ from: husbandAddress });
 		 let latestAssetId = assetIds[assetIds.length - 1];
		 let latestAssetIndex = latestAssetId - 1;
 		 await contract.removeAsset(latestAssetId, { from: husbandAddress });
		 await contract.removeAsset(latestAssetId, { from: wifeAddress });
 		 let asset = await contract.assets(latestAssetIndex);
 		 assert(asset[4] == true);
 	 })

	 it("should divorce", async () => {
		 let contract = await SmartWeddingContract.deployed();
 		 await contract.divorce({ from: husbandAddress });
		 assert.equal(await contract.divorced(), false);
		 let husbandBalance = web3.fromWei(web3.eth.getBalance(husbandAddress));
		 let wifeBalance = web3.fromWei(web3.eth.getBalance(wifeAddress));
		 await contract.divorce({ from: wifeAddress });
 		 assert.equal(await contract.divorced(), true);
		 let newHusbandBalance = web3.fromWei(web3.eth.getBalance(husbandAddress));
		 let newWifeBalance = web3.fromWei(web3.eth.getBalance(wifeAddress));
		 assert(newHusbandBalance > husbandBalance);
		 assert(newWifeBalance > wifeBalance);
 	 })
})
