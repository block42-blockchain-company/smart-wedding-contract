App = {
  web3Provider: undefined,
  contracts: {},
	userAccount: undefined,

  init: function() {
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
				console.log("Active wallet: " + App.userAccount);
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

			App.initListeners();
		});
  },

	initListeners: function() {
		$("#suggestAssetModal-range").change(function() {
			const value = $("#suggestAssetModal-range").val();
			$("#suggestAssetModal-husband").val(value);
			$("#suggestAssetModal-wife").val(100 - value);
		});

		return App.updateUi();
	},

	updateUi: function() {
		function updateAssetListItem(htmlString, asset, type, state) {
			return htmlString.replace("__ASSET__", asset).replace("__TYPE__", type).replace("__STATE__", state);
		}

		function updateEventListItem(htmlString, type, text) {
			return htmlString.replace("__TYPE__", type).replace("__TEXT__", text);
		}

		App.contracts.SmartWeddingContract.deployed().then(function(contract) {
			// Update contract address and balance
			web3.eth.getBalance(contract.address, function(error, balanceWei) {
				const balance = web3.fromWei(web3.toDecimal(balanceWei));
				$("#contract-address").text(contract.address);
				$("#contract-balance").text(Number(balance).toFixed(4));
			});

			// Update wallet address, balance and image
			web3.eth.getBalance(App.userAccount, function(error, balanceWei) {
				const balance = web3.fromWei(web3.toDecimal(balanceWei));

				$("#wallet-image").attr("src", addressToImageUrl(App.userAccount));
				$("#wallet-name").text(addressToName(App.userAccount, false));
				$("#wallet-address").text(App.userAccount);
				$("#wallet-balance").text(Number(balance).toFixed(4));
			});

			// Update spouse address: husband
			contract.husbandAddress().then(function(husbandAddress) {
				$("#contract-husbandAddress").val(husbandAddress);
			});

			// Update spouse address: wife
			contract.wifeAddress().then(function(wifeAddress) {
				$("#contract-wifeAddress").val(wifeAddress);
			});

			// Update written contract IPFS link
			contract.writtenContractId().then(function(writtenContractId) {
				$("#contract-link").attr("href", "http://localhost:8080/ipfs/" + writtenContractId);
			});

			// Update contract signed state
			contract.signed().then(function(signed) {
				$("#contract-signed").prop('checked', signed);
				return signed;
			}).then(function(signed) {
				// Update contract divorced state
				contract.divorced().then(function(divorced) {
					$("#contract-divorced").prop('checked', divorced);

					// Update action button states
					if (divorced) {
						$(".action-button").removeClass("btn-primary").addClass("btn-secondary");
					} else if (!signed) {
						$(".action-button").removeClass("btn-primary").addClass("btn-secondary");
						$("#button-signContract").removeClass("btn-secondary").addClass("btn-success");
					} else {
						$(".action-button").removeClass("btn-secondary").addClass("btn-primary");
						$("#button-signContract").removeClass("btn-success").addClass("btn-secondary");
						$("#button-divorce").removeClass("btn-secondary").addClass("btn-danger");
					}
				});
			});

			// Update assets
			contract.getAssetIds().then(function(assetIds) {
				$("#assets").empty();
				$("#addAssetModal-dropdown").empty();
				$("#removeAssetModal-dropdown").empty();

				_.each(assetIds, function(idAsBigNumber) {
					let assetListItem = "<li class=\"list-group-item d-flex justify-content-between align-items-center\">__ASSET__ <span class=\"badge badge-__TYPE__\">__STATE__</span></li>";

					const assetId = web3.toBigNumber(idAsBigNumber).toNumber();

					contract.assets(assetId - 1).then(function (asset) {
						const text = asset[0];
						const husbandAllocation = asset[1];
						const wifeAllocation = asset[2];
						const added = asset[3];
						const removed = asset[4];

						const formattedText = text + " (👨" + husbandAllocation + "% | 👩" + wifeAllocation + "%)";

						if (removed == true) {
							assetListItem = updateAssetListItem(assetListItem, formattedText, "danger", "Entfernt");
						} else if (added == true) {
							assetListItem = updateAssetListItem(assetListItem, formattedText, "success", "Hinzugefügt");
						} else {
							assetListItem = updateAssetListItem(assetListItem, formattedText, "warning", "Genehmigung ausständig");
						}

						$("#assets").append(assetListItem);
						$("#addAssetModal-dropdown").append(new Option(text, assetId));
						// Only append already assests which have not been removed yet
						if (added && !removed) $("#removeAssetModal-dropdown").append(new Option(text, assetId));
					});
				});
			});

			// Update events
			contract.allEvents({ fromBlock: 0, toBlock: "latest" }).get(function (error, result) {
				const events = result.reverse();

				console.log(result);

				$("#events").empty();

				_.each(events, function (eventObject) {
					let eventListItem = "<div class=\"alert alert-__TYPE__\" role=\"alert\">__TEXT__</div>";

					const asset = eventObject.args["asset"];
					const address = eventObject.args["wallet"];
					const amount = eventObject.args["amount"];
					const value = web3.fromWei(web3.toBigNumber(amount).toNumber());

					const nameOrAddress = addressToName(address, false);

					switch (eventObject.event) {
						case "Signed":
						eventListItem = updateEventListItem(eventListItem, "warning", nameOrAddress + " hat den Vertrag unterzeichnet!");
						break;
						case "ContractSigned":
						eventListItem = updateEventListItem(eventListItem, "success", "Beide Ehepartnern haben den Vertrag unterzeichnet!");
						break;
						case "AssetSuggested":
						eventListItem = updateEventListItem(eventListItem, "warning", nameOrAddress + " hat ein neues Asset vorgeschlagen: " + asset);
						break;
						case "AssetAddApproved":
						eventListItem = updateEventListItem(eventListItem, "warning", nameOrAddress + " hat das Asset genehmigt: " + asset);
						break;
						case "AssetAdded":
						eventListItem = updateEventListItem(eventListItem, "success", "Asset wurde hinzugefügt: " + asset);
						break;
						case "AssetRemoveApproved":
						eventListItem = updateEventListItem(eventListItem, "warning", nameOrAddress + " hat dem Entfernen des Assets zugestimmt: " + asset);
						break;
						case "AssetRemoved":
						eventListItem = updateEventListItem(eventListItem, "danger", "Asset wurde entfernt: " + asset);
						break;
						case "DivorceApproved":
						eventListItem = updateEventListItem(eventListItem, "warning", nameOrAddress + " hat die Scheidung eingereicht!");
						break;
						case "Divorced":
						eventListItem = updateEventListItem(eventListItem, "danger", "Beide Ehepartner haben der Scheidung zugestimmt!");
						break;
						case "Sent":
						eventListItem = updateEventListItem(eventListItem, "danger", value + " ETH wurden an " + nameOrAddress + " gesendet!");
						break;
						case "Received":
						eventListItem = updateEventListItem(eventListItem, "success", value + " ETH wurden von " + nameOrAddress + " empfangen!");
						break;
					}

					$("#events").append(eventListItem);
				});
			});
		});
	}
};

// ---------------------------------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------------------------------

$(document).ready(function() {
  App.init();
});

// ---------------------------------------------------------------------------------------------------------------------
// Smart contract functions
// ---------------------------------------------------------------------------------------------------------------------

function signContract() {
	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Sign Contract");
		return contract.signContract({ from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#signContractModal').modal('hide');
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#signContractModal').modal('hide');
		showErrorModal("Signing the contract failed!");
	});
}

function suggestAsset() {
	const asset = $("#suggestAssetModal-asset").val();
	const husbandAllocation = $("#suggestAssetModal-husband").val();
	const wifeAllocation = $("#suggestAssetModal-wife").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Suggest Asset -> " + asset);
		return contract.suggestAsset(asset, husbandAllocation, wifeAllocation, { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#suggestAssetModal').modal('hide');
		$("#suggestAssetModal-asset").val("");
		$("#suggestAssetModal-husband").val(50);
		$("#suggestAssetModal-wife").val(50);
		$("#suggestAssetModal-range").val(50);
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#suggestAssetModal').modal('hide');
		$("#suggestAssetModal-asset").val("");
		$("#suggestAssetModal-husband").val(50);
		$("#suggestAssetModal-wife").val(50);
		$("#suggestAssetModal-range").val(50);
		showErrorModal("Sugessting the asset failed!");
	});
}

function addAsset() {
	const assetId = $("#addAssetModal-dropdown").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Add asset with id -> " + assetId);
		return contract.addAsset(assetId, { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#addAssetModal').modal('hide');
		$("#addAssetModal-assetId").val("");
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#addAssetModal').modal('hide');
		$("#addAssetModal-assetId").val("");
		showErrorModal("Approving to add the asset failed!");
	});
}

function removeAsset() {
	const assetId = $("#removeAssetModal-dropdown").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Remove asset with id -> " + assetId);
		return contract.removeAsset(assetId, { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#removeAssetModal').modal('hide');
		$("#removeAssetModal-assetId").val("");
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#removeAssetModal').modal('hide');
		$("#removeAssetModal-assetId").val("");
		showErrorModal("Approving to remove the asset failed!");
	});
}

function sendFunds() {
	const amount = $("#sendFundsModal-amount").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Send Funds -> " + amount + " ETH");
		return web3.eth.sendTransaction({ from: App.userAccount, to: contract.address, value: web3.toWei(amount) }, function(error, hash) {
			console.log(hash);

			if (error) {
				console.log(error);
				$('#sendFundsModal').modal('hide');
				$("#sendFundsModal-amount").val("");
				showErrorModal("Sending funds failed!");
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
		console.log("Action: Send funds to " + address + " -> " + amount + " ETH");
		return contract.pay(address, web3.toWei(amount), { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#payModal').modal('hide');
		$("#payModal-address").val("");
		$("#payModal-amount").val("");
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#payModal').modal('hide');
		$("#payModal-address").val("");
		$("#payModal-amount").val("");
		showErrorModal("Payment failed!");
	});
}

function divorce() {
	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Divorce");
		return contract.divorce({ from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#divorceModal').modal('hide');
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#divorceModal').modal('hide');
		showErrorModal("Request to divorce failed!");
	});
}

// ---------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------

function showErrorModal(message) {
	$('#errorModalMessage').text(message);
	$('#errorModal').modal('show');
}

function addressToImageUrl(address) {
	if (_.isUndefined(address)) {
		return "";
	}

	let imageUrl = "/images/unknown.jpg";

	switch (address.toLowerCase()) {
		case "0x5f29482aee907075dcd88dffaf96daa50229b02e":
		imageUrl = "/images/husband.jpg";
		break;
		case "0x482f1a41ca69bce106c484ec21ca726be860cf40":
		imageUrl = "/images/wife.jpg";
		break;
	}

	return imageUrl;
}

function addressToName(address, useAddressIfUnknown) {
	if (_.isUndefined(address)) {
		return "";
	}

	let name = useAddressIfUnknown ? address : "Unbekannt";

	switch (address.toLowerCase()) {
		case "0x5f29482aee907075dcd88dffaf96daa50229b02e":
		name = "Lukas";
		break;
		case "0x482f1a41ca69bce106c484ec21ca726be860cf40":
		name = "Julia";
		break;
	}

	return name;
}
