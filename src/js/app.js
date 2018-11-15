App = {
  web3Provider: undefined,
  contracts: {},
	userAccount: undefined,
	writtenContractIpfsHash: "",
	assets: [],
	events: [],

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

		const walletUpdateInterval = setInterval(function() {
			// Check if account has changed
			if (web3.eth.accounts[0] !== App.userAccount) {
				App.userAccount = web3.eth.accounts[0];
				console.log("Active wallet: " + App.userAccount);
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
		$("#proposeAssetModal-range").change(function() {
			const value = $("#proposeAssetModal-range").val();
			$("#proposeAssetModal-husband").val(value);
			$("#proposeAssetModal-wife").val(100 - value);
		});

		return App.initPolling();
	},

	initPolling: function() {
		App.updateUi();

		const frontendUpdateInterval = setInterval(function() {
			// Check if function is already declared
			if (App.updateUi !== undefined) {
				App.updateUi();
			}
		}, 3000);
	},

	updateUi: function() {
		// Check if the encryption key has already been set
		if (localStorage.getItem("encryptionKey") === null) {
			$('#encryptionKeyModal').modal('show');
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

			// Update written contract ipfs link
			contract.writtenContractIpfsHash().then(function(writtenContractIpfsHash) {
				$("#written-contract-link").attr("href", "http://localhost:8080/ipfs/" + writtenContractIpfsHash);
				App.writtenContractIpfsHash = writtenContractIpfsHash;

				if (App.writtenContractIpfsHash.length !== 0) {
					$("#written-contract-link").removeClass("disabled");
				} else {
					$("#written-contract-link").addClass("disabled");
				}
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
						$(".action-button").attr("disabled", true);
					} else if (!signed) {
						$(".action-button").removeClass("btn-primary").addClass("btn-secondary");
						$(".action-button").attr("disabled", true);
						$("#button-proposeWrittenContract").removeClass("btn-secondary").addClass("btn-success");
						$("#button-proposeWrittenContract").attr("disabled", false);
						
						if (App.writtenContractIpfsHash.length !== 0) {
							$("#button-signContract").removeClass("btn-secondary").addClass("btn-success");
							$("#button-signContract").attr("disabled", false);
						}
					} else {
						$(".action-button").removeClass("btn-secondary").addClass("btn-primary");
						$(".action-button").attr("disabled", false);
						$("#button-proposeWrittenContract").removeClass("btn-success").addClass("btn-secondary");
						$("#button-proposeWrittenContract").attr("disabled", true);
						$("#button-signContract").removeClass("btn-success").addClass("btn-secondary");
						$("#button-signContract").attr("disabled", true);
						$("#button-divorce").removeClass("btn-secondary").addClass("btn-danger");
						$("#button-divorce").attr("disabled", false);
					}
				});
			});

			// Check if assets should be updated
			contract.getAssetIds().then(async function(assetIdsAsBigNumber) {
				const assetIds = _.map(assetIdsAsBigNumber, function(assetIdAsBigNumber) { return web3.toBigNumber(assetIdAsBigNumber).toNumber() });
				const newAssets = await Promise.all(_.map(assetIds, function(assetId) { return contract.assets(assetId - 1) }));

				// Update assets
				if (_.isEqual(newAssets, assets) === false) {
					App.assets = newAssets;

					$("#assets").empty();
					$("#approveAssetModal-dropdown").empty();
					$("#removeAssetModal-dropdown").empty();

					_.each(App.assets, function (asset) {
						let assetListItem = "<li class=\"list-group-item d-flex justify-content-between align-items-center\">__ASSET__ <span class=\"badge badge-__TYPE__\">__STATE__</span></li>";

						const text = decrypt(asset[0]);
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
							assetListItem = updateAssetListItem(assetListItem, formattedText, "warning", "Genehmigung ausstehend");
						}

						const assetId = _.indexOf(App.assets, asset) + 1;

						$("#assets").append(assetListItem);
						$("#approveAssetModal-dropdown").append(new Option(text, assetId));
						// Only append already assests which have not been removed yet
						if (added && !removed) $("#removeAssetModal-dropdown").append(new Option(text, assetId));
					});
				}
			});

			// Check if events should be updated
			contract.allEvents({ fromBlock: 0, toBlock: "latest" }).get(function (error, result) {
				const newEvents = [];

				_.each(result.reverse(), function (eventObject) {
					newEvents.push({ args: eventObject.args, event: eventObject.event });
				});

				// Update events
				if (_.isEqual(newEvents, events) === false) {
					App.events = newEvents;

					$("#events").empty();

					_.each(App.events, function (event) {
						let eventListItem = "<div class=\"alert alert-__TYPE__\" role=\"alert\">__TEXT__</div>";

						const asset = decrypt(event.args["asset"]);
						const address = event.args["wallet"];
						const amount = event.args["amount"];
						const value = web3.fromWei(web3.toBigNumber(amount).toNumber());
						const ipfsHash = event.args["ipfsHash"];

						switch (event.event) {
							case "WrittenContractProposed":
							eventListItem = updateEventListItem(eventListItem, "warning", addressToName(address, false) + " hat einen schriftlichen Vertrag vorgeschlagen: " + ipfsHash);
							break;
							case "Signed":
							eventListItem = updateEventListItem(eventListItem, "warning", addressToName(address, false) + " hat den Vertrag unterzeichnet!");
							break;
							case "ContractSigned":
							eventListItem = updateEventListItem(eventListItem, "success", "Beide Ehepartner haben den Vertrag unterzeichnet!");
							break;
							case "AssetProposed":
							eventListItem = updateEventListItem(eventListItem, "warning", addressToName(address, false) + " hat ein neues Asset vorgeschlagen: " + asset);
							break;
							case "AssetAddApproved":
							eventListItem = updateEventListItem(eventListItem, "warning", addressToName(address, false) + " hat das Asset genehmigt: " + asset);
							break;
							case "AssetAdded":
							eventListItem = updateEventListItem(eventListItem, "success", "Asset wurde hinzugefügt: " + asset);
							break;
							case "AssetRemoveApproved":
							eventListItem = updateEventListItem(eventListItem, "warning", addressToName(address, false) + " hat dem Entfernen des Assets zugestimmt: " + asset);
							break;
							case "AssetRemoved":
							eventListItem = updateEventListItem(eventListItem, "danger", "Asset wurde entfernt: " + asset);
							break;
							case "DivorceApproved":
							eventListItem = updateEventListItem(eventListItem, "warning", addressToName(address, false) + " hat die Scheidung eingereicht!");
							break;
							case "Divorced":
							eventListItem = updateEventListItem(eventListItem, "danger", "Beide Ehepartner haben der Scheidung zugestimmt!");
							break;
							case "Sent":
							eventListItem = updateEventListItem(eventListItem, "danger", value + " ETH wurden an " + addressToName(address, true) + " gesendet!");
							break;
							case "Received":
							eventListItem = updateEventListItem(eventListItem, "success", value + " ETH wurden von " + addressToName(address, true) + " empfangen!");
							break;
						}

						$("#events").append(eventListItem);
					});
				}
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

$(window).on("unload", function(e) {
	//localStorage.removeItem("encryptionKey");
});

// ---------------------------------------------------------------------------------------------------------------------
// Smart contract functions
// ---------------------------------------------------------------------------------------------------------------------

function proposeWrittenContract() {
	const writtenContractIpfsHash = $("#proposeWrittenContractModal-hash").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Propose Written Contract -> " + writtenContractIpfsHash);
		return contract.proposeWrittenContract(writtenContractIpfsHash, { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#proposeWrittenContractModal').modal('hide');
		$("#proposeWrittenContractModal-hash").val("");
	}).catch(function(error) {
		console.log(error);
		$('#proposeWrittenContractModal').modal('hide');
		$("#proposeWrittenContractModal-hash").val("");
		showErrorModal("Das Setzen des schriftlichen Vertrags ist fehlgeschlagen!");
	});
}

function signContract() {
	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Sign Contract");
		return contract.signContract({ from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#signContractModal').modal('hide');
	}).catch(function(error) {
		console.log(error);
		$('#signContractModal').modal('hide');
		showErrorModal("Das Unterzeichnen ist fehlgeschlagen!");
	});
}

function proposeAsset() {
	const asset = $("#proposeAssetModal-asset").val();
	const husbandAllocation = $("#proposeAssetModal-husband").val();
	const wifeAllocation = $("#proposeAssetModal-wife").val();

	const encryptedAsset = encrypt(asset);

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Propose Asset -> " + asset + " (encrypted: " + encryptedAsset + ")");
		return contract.proposeAsset(encryptedAsset, husbandAllocation, wifeAllocation, { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#proposeAssetModal').modal('hide');
		$("#proposeAssetModal-asset").val("");
		$("#proposeAssetModal-range").val(50);
		$("#proposeAssetModal-husband").val(50);
		$("#proposeAssetModal-wife").val(50);
	}).catch(function(error) {
		console.log(error);
		$('#proposeAssetModal').modal('hide');
		$("#proposeAssetModal-asset").val("");
		$("#proposeAssetModal-range").val(50);
		$("#proposeAssetModal-husband").val(50);
		$("#proposeAssetModal-wife").val(50);
		showErrorModal("Das Hinzufügen des Assets ist fehlgeschlagen!");
	});
}

function approveAsset() {
	const assetId = $("#approveAssetModal-dropdown").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Approve asset with id -> " + assetId);
		return contract.approveAsset(assetId, { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#approveAssetModal').modal('hide');
		$("#approveAssetModal-assetId").val("");
		App.updateUi();
	}).catch(function(error) {
		console.log(error);
		$('#approveAssetModal').modal('hide');
		$("#approveAssetModal-assetId").val("");
		showErrorModal("Das Bestätigen des Assets ist fehlgeschlagen!");
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
		showErrorModal("Das Bestätigen der Entfernung des Assets ist fehlgeschlagen!");
	});
}

function payIn() {
	const amount = $("#payInModal-amount").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: PayIn -> " + amount + " ETH");
		return web3.eth.sendTransaction({ from: App.userAccount, to: contract.address, value: web3.toWei(amount) }, function(error, hash) {
			console.log(hash);

			if (error) {
				console.log(error);
				$('#payInModal').modal('hide');
				$("#payInModal-amount").val("");
				showErrorModal("Die Einzahlung ist fehlgeschlagen!");
				return;
			}

			$('#payInModal').modal('hide');
			$("#payInModal-amount").val("");
		});
	});
}

function pay() {
	const address = $("#payModal-address").val();
	const amount = $("#payModal-amount").val();

	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Pay -> " + address + ", " + amount + " ETH");
		return contract.pay(address, web3.toWei(amount), { from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#payModal').modal('hide');
		$("#payModal-address").val("");
		$("#payModal-amount").val("");
	}).catch(function(error) {
		console.log(error);
		$('#payModal').modal('hide');
		$("#payModal-address").val("");
		$("#payModal-amount").val("");
		showErrorModal("Die Bezahlung ist fehlgeschlagen!");
	});
}

function divorce() {
	App.contracts.SmartWeddingContract.deployed().then(function(contract) {
		console.log("Action: Divorce");
		return contract.divorce({ from: App.userAccount });
	}).then(function(result) {
		console.log(result);
		$('#divorceModal').modal('hide');
	}).catch(function(error) {
		console.log(error);
		$('#divorceModal').modal('hide');
		showErrorModal("Das Einreichen der Scheidung ist fehlgeschlagen!");
	});
}

function showErrorModal(message) {
	$('#errorModalMessage').text(message);
	$('#errorModal').modal('show');
}

function setEncryptionKey() {
	const encryptionKey = $("#encryptionKeyModal-key").val();
	localStorage.setItem("encryptionKey", encryptionKey);
	$('#encryptionKeyModal').modal('hide');
	$("#encryptionKeyModal-key").val("");
}

// ---------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------

function updateAssetListItem(htmlString, asset, type, state) {
	return htmlString.replace("__ASSET__", asset).replace("__TYPE__", type).replace("__STATE__", state);
}

function updateEventListItem(htmlString, type, text) {
	return htmlString.replace("__TYPE__", type).replace("__TEXT__", text);
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

function encrypt(data) {
	if (_.isUndefined(data)) return "";

	// Get the encryption key from the local storage
	const encryptionKey = localStorage.getItem("encryptionKey");
	// Encrypt data
	return CryptoJS.AES.encrypt(data, encryptionKey).toString();
}

function decrypt(data) {
	if (_.isUndefined(data)) return "";

	// Get the encryption key from the local storage
	const encryptionKey = localStorage.getItem("encryptionKey");

	let decrypted;
	try {
		// Try to decrypt the data
		decrypted = CryptoJS.AES.decrypt(data, encryptionKey).toString(CryptoJS.enc.Utf8);
	} catch (error) {
		decrypted = "";
	}

	// Fallback to '???' if encryption key is wrong
	return decrypted.length === 0 ? "???" : decrypted;
}
