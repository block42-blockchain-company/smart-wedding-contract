App = {
  husbandAddress: "0x2baf3e0a838a54bc464c8e27195b891d02cac708",
  wifeAddress: "0x0ed52194e69fb8cc504ba036cf7c3b72d66a3eb2",

  web3Provider: undefined,
  contracts: {},
  userAccount: undefined,

  writtenContractIpfsHash: "",
  assets: [],
  events: [],

  init: () => {
    return App.initWeb3();
  },

  initWeb3: async () => {
    // Check if MetaMask is available
    if (typeof web3 === 'undefined') {
      showErrorModal(undefined, "Bitte installiere und aktiviere MetaMask! -> metamask.io");
      return
    }

    // Check for new web3 provider
    if (ethereum !== undefined) {
      App.web3Provider = ethereum;
    } else {
      App.web3Provider = web3.currentProvider;
    }

    // Get a web3 instance
    web3 = new Web3(App.web3Provider);
    App.userAccount = await web3.eth.accounts[0];

    // Check if MetaMask privacy mode is enabled
    if (App.userAccount === undefined && ethereum !== undefined) {
      await ethereum.enable();
    }

    // Check for wallet changes
    const walletUpdateInterval = setInterval(async () => {
      const wallet = await web3.eth.accounts[0];
      // Check if account has changed
      if (wallet !== App.userAccount) {
        App.userAccount = wallet;
        console.log("Active wallet: " + App.userAccount);
        if (App.updateUi !== undefined) App.updateUi();
      }
    }, 100);

    return App.initContract();
  },

  initContract: () => {
    $.getJSON('./SmartWeddingContract.json', (data) => {
      const SmartWeddingContract = data;

      // Get the necessary contract artifact file and instantiate it with truffle-contract
      App.contracts.SmartWeddingContract = TruffleContract(SmartWeddingContract);
      // Set the provider for our contract
      App.contracts.SmartWeddingContract.setProvider(App.web3Provider);

      App.initListeners();
    });
  },

  initListeners: () => {
    $("#proposeAssetModal-range").change(() => {
      const value = $("#proposeAssetModal-range").val();
      $("#proposeAssetModal-husband").val(value);
      $("#proposeAssetModal-wife").val(100 - value);
    });

    return App.initPolling();
  },

  initPolling: () => {
    App.updateUi();

    const frontendUpdateInterval = setInterval(() => {
      // Check if function is already declared
      if (App.updateUi !== undefined) {
        App.updateUi();
      }
    }, 3000);
  },

  updateUi: () => {
    if (App.userAccount === undefined) return;
    if (App.contracts.SmartWeddingContract === undefined) return;

    App.contracts.SmartWeddingContract.deployed().then((contract) => {
      // Update contract address and balance
      web3.eth.getBalance(contract.address, (error, balanceWei) => {
        const balance = web3.fromWei(web3.toDecimal(balanceWei));
        $("#contract-address").text(contract.address);
        $("#contract-balance").text(Number(balance).toFixed(4));
      });

      // Update wallet address, balance and image
      web3.eth.getBalance(App.userAccount, (error, balanceWei) => {
        const balance = web3.fromWei(web3.toDecimal(balanceWei));

        $("#wallet-image").attr("src", addressToImageUrl(App.userAccount));
        $("#wallet-type").text(addressToType(App.userAccount));
        $("#wallet-address").text(App.userAccount);
        $("#wallet-balance").text(Number(balance).toFixed(4));
      });

      // Update spouse addresses
      contract.husbandAddress().then((husbandAddress) => {
        $("#contract-husbandAddress").val(husbandAddress);
        promptForAccessKeyIfNecessary(husbandAddress);
      });
      contract.wifeAddress().then((wifeAddress) => {
        $("#contract-wifeAddress").val(wifeAddress);
        promptForAccessKeyIfNecessary(wifeAddress);
      });

      // Update written contract ipfs link
      contract.writtenContractIpfsHash().then((writtenContractIpfsHash) => {
        $("#written-contract-link").attr("href", "https://ipfs.io/ipfs/" + writtenContractIpfsHash);
        App.writtenContractIpfsHash = writtenContractIpfsHash;
      });

      // Update contract signed state
      contract.signed().then((signed) => {
        $("#contract-status-signed").prop('checked', signed);
        return signed;
      }).then((signed) => {
        // Update contract divorced state
        contract.divorced().then((divorced) => {
          $("#contract-status-divorced").prop('checked', divorced);

          // Update action button states
          if (divorced) {
            $(".signed-action-button").attr("disabled", true);
            $("#action-written-contract-upload").attr("disabled", true);
            $("#action-written-contract-download").attr("disabled", false);
            $("#action-sign-contract").attr("disabled", true);
            $("#action-propose-asset").addClass("hidden");
          } else if (!signed) {
            $(".signed-action-button").attr("disabled", true);
            $("#action-written-contract-upload").attr("disabled", false);

            if (App.writtenContractIpfsHash.length !== 0) {
              $("#action-written-contract-download").attr("disabled", false);
              $("#action-sign-contract").attr("disabled", false);
            }
          } else {
            $(".signed-action-button").attr("disabled", false);
            $("#action-written-contract-upload").attr("disabled", true);
            $("#action-written-contract-download").attr("disabled", false);
            $("#action-sign-contract").attr("disabled", true);
            $("#action-propose-asset").removeClass("hidden");
          }
        });
      });

      // Check if assets should be updated
      contract.getAssetIds().then(async (assetIdsAsBigNumber) => {
        const assetIds = _.map(assetIdsAsBigNumber, (assetIdAsBigNumber) => { return web3.toBigNumber(assetIdAsBigNumber).toNumber() });
        const newAssets = await Promise.all(_.map(assetIds, (assetId) => { return contract.assets(assetId - 1) }));

        // Update assets
        if (_.isEqual(newAssets, assets) === false) {
          App.assets = newAssets;

          $("#assets").empty();

          _.each(App.assets, (asset) => {
            let row = "<tr><td>__ASSET__</td><td>__HUSBAND_ALLOCATION__%</td><td>__WIFE_ALLOCATION__%</td><td><span class=\"badge badge-__TYPE__\">__STATE__</span></td><td>__ACTION__</td></tr>"

            const assetId = _.indexOf(App.assets, asset) + 1;

            const text = decrypt(asset[0]);
            const husbandAllocation = asset[1];
            const wifeAllocation = asset[2];
            const added = asset[3];
            const removed = asset[4];

            row = row.replace("__ASSET__", text).replace("__HUSBAND_ALLOCATION__", husbandAllocation).replace("__WIFE_ALLOCATION__", wifeAllocation);

            if (removed == true) {
              row = row.replace("__TYPE__", "danger").replace("__STATE__", "Entfernt").replace("__ACTION__", "");
            } else if (added == true) {
              row = row.replace("__TYPE__", "success").replace("__STATE__", "Hinzugefügt").replace("__ACTION__", `<i class="material-icons" onclick="removeAsset(${assetId})">delete</i>`);
            } else {
              row = row.replace("__TYPE__", "warning").replace("__STATE__", "Zustimmung ausstehend").replace("__ACTION__", `<i class="material-icons" onclick="approveAsset(${assetId})">check</i>`);
            }

            $("#assets").append(row);
          });

          if (!_.isEmpty(App.assets)) {
            $("#asset-table").removeClass("hidden");
          }
        }
      });

      // Narrow the block range (1 = mainnet, 3 = ropsten testnet)
      const fromBlockNumber = web3.version.network === "1" ? 6775421 : web3.version.network === "3" ? 4489772 : 0;

      // Check if events should be updated
      contract.allEvents({ fromBlock: fromBlockNumber, toBlock: "latest" }).get((error, result) => {
        const newEvents = [];

        _.each(result.reverse(), (eventObject) => {
          newEvents.push({ args: eventObject.args, event: eventObject.event, blockNumber: eventObject.blockNumber });
        });

        // Update events
        if (_.isEqual(newEvents, events) === false) {
          App.events = newEvents;

          $("#events").empty();

          _.each(App.events, async (event) => {
            let eventListItem = "<div class=\"alert alert-__TYPE__ text-truncate\" role=\"alert\">__TEXT__<span class=\"float-right time-ago\">__TIME__</span></div>";

            const asset = decrypt(event.args["asset"]);
            const address = event.args["wallet"];
            const amount = event.args["amount"];
            const value = web3.fromWei(web3.toBigNumber(amount).toNumber());
            const ipfsHash = event.args["ipfsHash"];
            const timestamp  = web3.toBigNumber(event.args["timestamp"]).toNumber() * 1000;

            switch (event.event) {
              case "WrittenContractProposed":
              eventListItem = updateEventListItem(eventListItem, "warning", timestamp, addressToType(address, false) + " hat einen schriftlichen Vertrag vorgeschlagen: " + ipfsHash);
              break;
              case "Signed":
              eventListItem = updateEventListItem(eventListItem, "warning", timestamp, addressToType(address, false) + " hat den Vertrag unterzeichnet!");
              break;
              case "ContractSigned":
              eventListItem = updateEventListItem(eventListItem, "success", timestamp, "Beide Ehepartner haben den Vertrag unterzeichnet!");
              break;
              case "AssetProposed":
              eventListItem = updateEventListItem(eventListItem, "warning", timestamp, addressToType(address, false) + " hat ein neues Asset vorgeschlagen: " + asset);
              break;
              case "AssetAddApproved":
              eventListItem = updateEventListItem(eventListItem, "warning", timestamp, addressToType(address, false) + " hat das Asset genehmigt: " + asset);
              break;
              case "AssetAdded":
              eventListItem = updateEventListItem(eventListItem, "success", timestamp, "Asset hinzugefügt: " + asset);
              break;
              case "AssetRemoveApproved":
              eventListItem = updateEventListItem(eventListItem, "warning", timestamp, addressToType(address, false) + " hat dem Entfernen des Assets zugestimmt: " + asset);
              break;
              case "AssetRemoved":
              eventListItem = updateEventListItem(eventListItem, "danger", timestamp, "Asset entfernt: " + asset);
              break;
              case "DivorceApproved":
              eventListItem = updateEventListItem(eventListItem, "warning", timestamp, addressToType(address, false) + " hat die Scheidung eingereicht!");
              break;
              case "Divorced":
              eventListItem = updateEventListItem(eventListItem, "danger", timestamp, "Beide Ehepartner haben der Scheidung zugestimmt!");
              break;
              case "FundsSent":
              eventListItem = updateEventListItem(eventListItem, "danger", timestamp, value + " ETH wurden an " + addressToType(address, true) + " gesendet!");
              break;
              case "FundsReceived":
              eventListItem = updateEventListItem(eventListItem, "success", timestamp, value + " ETH wurden von " + addressToType(address, true) + " empfangen!");
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
// Smart contract interface
// ---------------------------------------------------------------------------------------------------------------------

function uploadWrittenContract() {
  const writtenContractIpfsHash = $("#uploadWrittenContractModal-hash").val();

  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: Propose Written Contract -> " + writtenContractIpfsHash);
    return contract.proposeWrittenContract(writtenContractIpfsHash, { from: App.userAccount });
  }).then((result) => {
    console.log(result);
    $('#uploadWrittenContractModal').modal('hide');
    $("#uploadWrittenContractModal-hash").val("");
  }).catch((error) => {
    console.log(error);
    $('#uploadWrittenContractModal').modal('hide');
    $("#uploadWrittenContractModal-hash").val("");
    showErrorModal(error, "Das Setzen des schriftlichen Vertrags ist fehlgeschlagen!");
  });
}

function signContract() {
  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: Sign Contract");
    return contract.signContract({ from: App.userAccount });
  }).then((result) => {
    console.log(result);
    $('#signContractModal').modal('hide');
  }).catch((error) => {
    console.log(error);
    $('#signContractModal').modal('hide');
    showErrorModal(error, "Das Unterzeichnen ist fehlgeschlagen!");
  });
}

function proposeAsset() {
  const asset = $("#proposeAssetModal-asset").val();
  const husbandAllocation = $("#proposeAssetModal-husband").val();
  const wifeAllocation = $("#proposeAssetModal-wife").val();

  const encryptedAsset = encrypt(asset);

  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: Propose Asset -> " + asset + " (encrypted: " + encryptedAsset + ")");
    return contract.proposeAsset(encryptedAsset, husbandAllocation, wifeAllocation, { from: App.userAccount });
  }).then((result) => {
    console.log(result);
    $('#proposeAssetModal').modal('hide');
    $("#proposeAssetModal-asset").val("");
    $("#proposeAssetModal-range").val(50);
    $("#proposeAssetModal-husband").val(50);
    $("#proposeAssetModal-wife").val(50);
  }).catch((error) => {
    console.log(error);
    $('#proposeAssetModal').modal('hide');
    $("#proposeAssetModal-asset").val("");
    $("#proposeAssetModal-range").val(50);
    $("#proposeAssetModal-husband").val(50);
    $("#proposeAssetModal-wife").val(50);
    showErrorModal(error, "Das Hinzufügen des Assets ist fehlgeschlagen!");
  });
}

function approveAsset(assetId) {
  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: Approve asset with id -> " + assetId);
    return contract.approveAsset(assetId, { from: App.userAccount });
  }).then((result) => {
    console.log(result);
    App.updateUi();
  }).catch((error) => {
    console.log(error);
    showErrorModal(error, "Das Bestätigen des Assets ist fehlgeschlagen!");
  });
}

function removeAsset(assetId) {
  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: Remove asset with id -> " + assetId);
    return contract.removeAsset(assetId, { from: App.userAccount });
  }).then((result) => {
    console.log(result);
    App.updateUi();
  }).catch((error) => {
    console.log(error);
    showErrorModal(error, "Das Bestätigen der Entfernung des Assets ist fehlgeschlagen!");
  });
}

function payIn() {
  const amount = $("#payInModal-amount").val();

  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: PayIn -> " + amount + " ETH");
    return web3.eth.sendTransaction({ from: App.userAccount, to: contract.address, value: web3.toWei(amount) }, (error, hash) => {
      console.log(hash);

      $('#payInModal').modal('hide');
      $("#payInModal-amount").val("");

      if (error) {
        console.log(error);
        showErrorModal(error, "Die Einzahlung ist fehlgeschlagen!");
      }
    });
  });
}

function pay() {
  const address = $("#payModal-address").val();
  const amount = $("#payModal-amount").val();

  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: Pay -> " + address + ", " + amount + " ETH");
    return contract.pay(address, web3.toWei(amount), { from: App.userAccount });
  }).then((result) => {
    console.log(result);
    $('#payModal').modal('hide');
    $("#payModal-address").val("");
    $("#payModal-amount").val("");
  }).catch((error) => {
    console.log(error);
    $('#payModal').modal('hide');
    $("#payModal-address").val("");
    $("#payModal-amount").val("");
    showErrorModal(error, "Die Bezahlung ist fehlgeschlagen!");
  });
}

function divorce() {
  App.contracts.SmartWeddingContract.deployed().then((contract) => {
    console.log("Action: Divorce");
    return contract.divorce({ from: App.userAccount });
  }).then((result) => {
    console.log(result);
    $('#divorceModal').modal('hide');
  }).catch((error) => {
    console.log(error);
    $('#divorceModal').modal('hide');
    showErrorModal(error, "Das Einreichen der Scheidung ist fehlgeschlagen!");
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------------------------------

$(document).ready(() => {
  App.init();
});

// ---------------------------------------------------------------------------------------------------------------------
// UI Callbacks
// ---------------------------------------------------------------------------------------------------------------------

$("#action-propose-asset").click(() => {
  $('#proposeAssetModal').modal('show');
});

$("#action-set-access-key").click(() => {
  $('#accessKeyModal').modal('show');
});

// ---------------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------------

function promptForAccessKeyIfNecessary(address) {
  // Check if the encryption key has already been set
  if (localStorage.getItem("accessKey") === null && App.userAccount === address) {
    $('#accessKeyModal').modal('show');
  }
}

function showErrorModal(error, message) {
  // Check if the user denied the transaction
  if (!_.isUndefined(error.message) && error.message.includes("denied")) return;

  $('#errorModalMessage').text(message);
  $('#errorModal').modal('show');
}

function setAccessKey() {
  const accessKey = $("#accessKeyModal-value").val();
  localStorage.setItem("accessKey", accessKey);
  $('#accessKeyModal').modal('hide');
  $("#accessKeyModal-value").val("");
}

function downloadWrittenContract() {
  window.open("https://ipfs.io/ipfs/" + App.writtenContractIpfsHash, "_blank");
}

function updateEventListItem(htmlString, type, time, text) {
  return htmlString.replace("__TYPE__", type).replace("__TIME__", moment(time).fromNow()).replace("__TEXT__", text);
}

function addressToImageUrl(address) {
  if (_.isUndefined(address)) return "ERROR";

  let imageUrl = "./images/unknown.jpg";

  switch (address.toLowerCase()) {
    case App.husbandAddress:
    imageUrl = "./images/husband.jpg";
    break;
    case App.wifeAddress:
    imageUrl = "./images/wife.jpg";
    break;
  }

  return imageUrl;
}

function addressToType(address, useAddressIfUnknown) {
  if (_.isUndefined(address)) return "ERROR";

  let name = useAddressIfUnknown ? address : "Unbekannt";

  switch (address.toLowerCase()) {
    case App.husbandAddress:
    name = "Ehemann";
    break;
    case App.wifeAddress:
    name = "Ehefrau";
    break;
  }

  return name;
}

function encrypt(data) {
  if (_.isUndefined(data)) return "ERROR";

  // Get the key from the local storage
  const accessKey = localStorage.getItem("accessKey");
  // Encrypt data
  return CryptoJS.AES.encrypt(data, accessKey).toString();
}

function decrypt(data) {
  if (_.isUndefined(data)) return "ERROR";

  // Get the key from the local storage
  const accessKey = localStorage.getItem("accessKey");

  let decrypted;
  try {
    // Try to decrypt the data
    decrypted = CryptoJS.AES.decrypt(data, accessKey).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    decrypted = "???";
  }

  // Fallback to '???' if encryption key is wrong
  return decrypted.length === 0 ? "???" : decrypted;
}
