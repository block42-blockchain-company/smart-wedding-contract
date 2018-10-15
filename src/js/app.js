App = {
  web3Provider: undefined,
  contracts: {},
	userAccount: undefined,

  init: function() {
		$("#suggestAssetModal-range").change(function() {
			const value = $("#suggestAssetModal-range").val();
			$("#suggestAssetModal-husband").val(value);
			$("#suggestAssetModal-wife").val(100 - value);
		});

    return App.initWeb3();
  },

  initWeb3: function() {
		// Is there an injected web3 instance?
		if (typeof web3 !== 'undefined') {
  		App.web3Provider = web3.currentProvider;
		} else {
  		// If no injected web3 instance is detected, fall back to Ganache
  		App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
		}

		web3 = new Web3(App.web3Provider);
		App.userAccount = web3.eth.accounts[0];

		const accountInterval = setInterval(function() {
			// Check if account has changed
			if (web3.eth.accounts[0] !== App.userAccount) {
				App.userAccount = web3.eth.accounts[0];
				console.log("Active user account: " + App.userAccount);
				App.updateUi();
			}
		}, 100);

    return App.initContract();
  },

  initContract: function() {
		$.getJSON('SmartWeddingContract.json', function(data) {
			const SmartWeddingContract = data;

  		// Get the necessary contract artifact file and instantiate it with truffle-contract
  		App.contracts.SmartWeddingContract = TruffleContract(SmartWeddingContract);
  		// Set the provider for our contract
  		App.contracts.SmartWeddingContract.setProvider(App.web3Provider);

			App.updateUi();
		});
  },

	updateUi: function() {
		function updateAssetListItem(htmlString, asset, type, state) {
			return htmlString.replace("__ASSET__", asset).replace("__TYPE__", type).replace("__STATE__", state);
		}

		function updateEventListItem(htmlString, type, text) {
			return htmlString.replace("__TYPE__", type).replace("__TEXT__", text);
		}

		App.contracts.SmartWeddingContract.deployed().then(function(contract) {
			// Update contract
			web3.eth.getBalance(contract.address, function(error, balance) {
				const ethBalance = web3.fromWei(web3.toDecimal(balance));
				$("#contract-address").text(contract.address);
				$("#contract-balance").text(Number(ethBalance).toFixed(4));
			});

			contract.husbandAddress().then(function(husbandAddress) {
				$("#contract-husbandAddress").val(husbandAddress);
			});

			contract.wifeAddress().then(function(wifeAddress) {
				$("#contract-wifeAddress").val(wifeAddress);
			});

			contract.writtenContractId().then(function(writtenContractId) {
				$("#contract-link").attr("href", "http://localhost:8080/ipfs/" + writtenContractId);
			});

			contract.signed().then(function(signed) {
				$("#contract-signed").prop('checked', signed);
			});

			contract.divorced().then(function(divorced) {
				$("#contract-divorced").prop('checked', divorced);
			});

			contract.getAssetIds().then(function(assetIds) {
				$("#assets").empty();
				$("#addAssetModal-dropdown").empty();
				$("#removeAssetModal-dropdown").empty();

				_.each(assetIds, async function(idAsBigNumber) {
					let assetListItem = "<li class=\"list-group-item d-flex justify-content-between align-items-center\">__ASSET__ <span class=\"badge badge-__TYPE__\">__STATE__</span></li>";

					const assetId = web3.toBigNumber(idAsBigNumber).toNumber();
					const asset = await contract.assets(assetId - 1);

					const text = asset[0];
					const husbandAllocation = asset[1];
					const wifeAllocation = asset[2];
					const added = asset[3];
					const removed = asset[4];

					if (removed == true) {
						assetListItem = updateAssetListItem(assetListItem, text + " (👨" + husbandAllocation + "% | 👩" + wifeAllocation + "%)", "danger", "Removed");
					} else if (added == true) {
						assetListItem = updateAssetListItem(assetListItem, text + " (👨" + husbandAllocation + "% | 👩" + wifeAllocation + "%)", "success", "Added");
					} else {
						assetListItem = updateAssetListItem(assetListItem, text + " (👨" + husbandAllocation + "% | 👩" + wifeAllocation + "%)", "warning", "Approval pending");
					}

					$("#assets").append(assetListItem);
					$("#addAssetModal-dropdown").append(new Option(text, assetId));
					if (added && !removed) $("#removeAssetModal-dropdown").append(new Option(text, assetId));
				});
			}).then(function () {
				contract.allEvents({ fromBlock: 0, toBlock: "latest" }).get(function (error, result) {
					const events = result.reverse();

					console.log(events);

					$("#events").empty();

					_.each(events, function (eventObject) {
						let eventListItem = "<div class=\"alert alert-__TYPE__\" role=\"alert\">__TEXT__</div>";

						const asset = eventObject.args["asset"];
						const address = eventObject.args["wallet"];
						const amount = eventObject.args["amount"];
						const value = web3.fromWei(web3.toBigNumber(amount).toNumber());

						switch (eventObject.event) {
							case "Signed":
							eventListItem = updateEventListItem(eventListItem, "warning", "Contract signed by: " + sender);
							break;
							case "ContractSigned":
							eventListItem = updateEventListItem(eventListItem, "success", "Contract signed by both spouses!");
							break;
							case "AssetSuggested":
							eventListItem = updateEventListItem(eventListItem, "warning", "Asset suggested by " + sender + ": " + asset);
							break;
							case "AssetAddApproved":
							eventListItem = updateEventListItem(eventListItem, "warning", "Adding asset approved by " + sender + ": " + asset);
							break;
							case "AssetAdded":
							eventListItem = updateEventListItem(eventListItem, "success", "Asset added: " + asset);
							break;
							case "AssetRemoveApproved":
							eventListItem = updateEventListItem(eventListItem, "warning", "Removing asset approved by " + sender + ": " + asset);
							break;
							case "AssetRemoved":
							eventListItem = updateEventListItem(eventListItem, "danger", "Asset removed: " + asset);
							break;
							case "DivorceApproved":
							eventListItem = updateEventListItem(eventListItem, "warning", "Divorce approved by " + sender);
							break;
							case "Divorced":
							eventListItem = updateEventListItem(eventListItem, "danger", "Divorced");
							break;
							case "Sent":
							eventListItem = updateEventListItem(eventListItem, "danger", "Funds sent to " + address + ": " + value + " ETH");
							break;
							case "Received":
							eventListItem = updateEventListItem(eventListItem, "success", "Funds received from " + address + ": " + value + " ETH");
							break;
						}

						$("#events").append(eventListItem);
					});
				});
			});
		})

		// Update wallet
		web3.eth.getBalance(App.userAccount, function(error, balance) {
			const ethBalance = web3.fromWei(web3.toDecimal(balance));
			$("#wallet-address").text(App.userAccount);
			$("#wallet-balance").text(Number(ethBalance).toFixed(4));

			if (App.userAccount.toLowerCase() == "0x5F29482aEe907075DCD88dffAF96dAa50229b02e".toLowerCase()) {
				$("#wallet-image").attr("src", "/images/husband.jpg");
			} else if (App.userAccount.toLowerCase() == "0x482f1A41ca69BcE106c484ec21CA726BE860Cf40".toLowerCase()) {
				$("#wallet-image").attr("src", "/images/wife.jpg");
			} else {
				$("#wallet-image").attr("src", "/images/unknown.jpg");
			}
		})
	}
};

$(document).ready(function() {
  App.init();
});

function showError(message) {
	$('#errorModalMessage').text(message);
	$('#errorModal').modal('show');
}

function suggestAsset() {
	const asset = $("#suggestAssetModal-asset").val();
	const husbandAllocation = $("#suggestAssetModal-husband").val();
	const wifeAllocation = $("#suggestAssetModal-wife").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Suggest asset: " + asset);
		return contract.suggestAsset(asset, husbandAllocation, wifeAllocation, { from: App.userAccount });
	}).then(function(result) {
		$('#suggestAssetModal').modal('hide');
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#suggestAssetModal').modal('hide');
		showError("Sugessting the asset failed!");
	});
}

function addAsset() {
	const assetId = $("#addAssetModal-dropdown").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Add asset with id: " + assetId);
		return contract.addAsset(assetId, { from: App.userAccount });
	}).then(function(result) {
		$('#addAssetModal').modal('hide');
		$("#addAssetModal-assetId").val("");
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#addAssetModal').modal('hide');
		$("#addAssetModal-assetId").val("");
		showError("Approving to add the asset failed!");
	});
}

function removeAsset() {
	const assetId = $("#removeAssetModal-dropdown").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Remove asset with id: " + assetId);
		return contract.removeAsset(assetId, { from: App.userAccount });
	}).then(function(result) {
		$('#removeAssetModal').modal('hide');
		$("#removeAssetModal-assetId").val("");
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#removeAssetModal').modal('hide');
		$("#removeAssetModal-assetId").val("");
		showError("Approving to remove the asset failed!");
	});
}

function sendFunds() {
	const amount = $("#sendFundsModal-amount").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Send Funds: " + amount + " ETH");
		return web3.eth.sendTransaction({ from: App.userAccount, to: contract.address, value: web3.toWei(amount) }, function(error, hash) {
			if (error) {
				console.log(error);
				$('#sendFundsModal').modal('hide');
				showError("Sending funds failed!");
				return;
			}

			$('#sendFundsModal').modal('hide');
			$("#sendFundsModal-amount").val("");
			App.updateUi();
		});
	});
}

function pay() {
	const address = $("#payModal-address").val();
	const amount = $("#payModal-amount").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Send funds to " + address + ": " + amount + " ETH");
		return contract.pay(address, web3.toWei(amount), { from: App.userAccount });
	}).then(function(result) {
		$('#payModal').modal('hide');
		$("#payModal-address").val("");
		$("#payModal-amount").val("");
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#payModal').modal('hide');
		showError("Payment failed!");
	});
}

function divorce() {
	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Divorce");
		return contract.divorce({ from: App.userAccount });
	}).then(function(result) {
		$('#divorceModal').modal('hide');
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#divorceModal').modal('hide');
		showError("Request to divorce failed!");
	});
}

function signContract() {
	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Sign Contract");
		return contract.signContract({ from: App.userAccount });
	}).then(function(result) {
		$('#signModal').modal('hide');
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#signModal').modal('hide');
		showError("Signing the contract failed!");
	});
}
