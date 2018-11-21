pragma solidity 0.4.24;


/**
 * @title SmartWeddingContract
 * @dev The contract has both addresses of the husband and the wife. It is capable of handling assets, funds and
 * dissolution. A multisig variant is used to consider the decision of both parties.
 */
contract SmartWeddingContract {
	event WrittenContractProposed(uint timestamp, string ipfsHash, address wallet);
	event Signed(uint timestamp, address wallet);
	event ContractSigned(uint timestamp);
	event AssetProposed(uint timestamp, string asset, address wallet);
	event AssetAddApproved(uint timestamp, string asset, address wallet);
	event AssetAdded(uint timestamp, string asset);
	event AssetRemoveApproved(uint timestamp, string asset, address wallet);
	event AssetRemoved(uint timestamp, string asset);
	event DivorceApproved(uint timestamp, address wallet);
	event Divorced(uint timestamp);
	event Sent(uint timestamp, address wallet, uint amount);
	event Received(uint timestamp, address wallet, uint amount);

	bool public signed = false;
	bool public divorced = false;

	mapping (address => bool) private hasSigned;
	mapping (address => bool) private hasDivorced;

	address public husbandAddress;
	address public wifeAddress;
	string public writtenContractIpfsHash;

	struct Asset {
		string data;
		uint husbandAllocation;
		uint wifeAllocation;
		bool added;
		bool removed;
		mapping (address => bool) hasApprovedAdd;
		mapping (address => bool) hasApprovedRemove;
	}

	Asset[] public assets;

	/**
	 * @dev Modifier that only allows spouse execution.
 	 */
	modifier onlySpouse() {
		require(msg.sender == husbandAddress || msg.sender == wifeAddress, "Sender is not a spouse!");
		_;
	}

	/**
	 * @dev Modifier that checks if the contract has been signed by both spouses.
 	 */
	modifier isSigned() {
		require(signed == true, "Contract has not been signed by both spouses yet!");
		_;
	}

	/**
	 * @dev Modifier that only allows execution if the spouses have not been divorced.
 	 */
	modifier isNotDivorced() {
		require(divorced == false, "Can not be called after spouses agreed to divorce!");
		_;
	}

	/**
	 * @dev Internal helper function to check if a string is the same as another.
	 */
	function isSameString(string memory string1, string memory string2) private pure returns (bool) {
		return keccak256(abi.encodePacked(string1)) != keccak256(abi.encodePacked(string2));
	}

	/**
	 * @dev Constructor sets the addresses of both spouses.
	 * @param _husbandAddress Wallet address of the husband.
	 * @param _wifeAddress Wallet address of the wife.
	 */
	constructor(address _husbandAddress, address _wifeAddress) public {
		require(_husbandAddress != address(0), "Husband address must not be zero!");
		require(_wifeAddress != address(0), "Wife address must not be zero!");
		require(_husbandAddress != _wifeAddress, "Husband address must not equal wife address!");

		husbandAddress = _husbandAddress;
		wifeAddress = _wifeAddress;
	}

	/**
	 * @dev Default function to enable sending funds to the contract.
 	 */
	function() external payable isSigned isNotDivorced {
		emit Received(now, msg.sender, msg.value);
	}

	/**
	 * @dev Propose a written contract.
	 * @param _writtenContractIpfsHash IPFS hash of the written contract.
	 */
	function proposeWrittenContract(string _writtenContractIpfsHash) external onlySpouse {
		require(signed == false, "Written contract ipfs hash can not be changed. Both spouses have already signed it!");

		// Update written contract ipfs hash
		writtenContractIpfsHash = _writtenContractIpfsHash;

		emit WrittenContractProposed(now, _writtenContractIpfsHash, msg.sender);

		// Revoke previous signatures
		if (hasSigned[husbandAddress] == true) {
			hasSigned[husbandAddress] = false;
		}
		if (hasSigned[wifeAddress] == true) {
			hasSigned[wifeAddress] = false;
		}
	}

	/**
	 * @dev Sign the contract.
	 */
	function signContract() external onlySpouse {
		require(isSameString(writtenContractIpfsHash, ""), "Written contract ipfs hash has been proposed yet!");
		require(hasSigned[msg.sender] == false, "Spouse has already signed the contract!");

		// Sender signed
		hasSigned[msg.sender] = true;

		emit Signed(now, msg.sender);

		// Check if both spouses have signed
		if (hasSigned[husbandAddress] && hasSigned[wifeAddress]) {
			signed = true;
			emit ContractSigned(now);
		}
	}

	function pay(address _to, uint _amount) external onlySpouse isSigned isNotDivorced {
		require(_to != address(0), "Burning funds is prohibited!");
		require(_amount <= address(this).balance, "Not enough balance available!");

		// Send funds to the destination address
		_to.transfer(_amount);

		emit Sent(now, _to, _amount);
	}

	/**
	 * @dev Propose to add an asset. The other spouse needs to approve this action.
	 * @param _data The asset represented as a string.
	 * @param _husbandAllocation Allocation of the husband.
	 * @param _wifeAllocation Allocation of the wife.
	 */
	function proposeAsset(string _data, uint _husbandAllocation, uint _wifeAllocation) external onlySpouse isSigned isNotDivorced {
		require(isSameString(_data, ""), "No asset data provided!");
		require(_husbandAllocation >= 0, "Husband allocation invalid!");
		require(_wifeAllocation >= 0, "Wife allocation invalid!");
		require((_husbandAllocation + _wifeAllocation) == 100, "Allocation sum does not equal 100%!");

		// Add new asset
		Asset memory newAsset = Asset({
			data: _data,
			husbandAllocation: _husbandAllocation,
			wifeAllocation: _wifeAllocation,
			added: false,
			removed: false
		});
		uint newAssetId = assets.push(newAsset);

		// Map to a storage object (otherwise mappings could not be accessed)
		Asset storage asset = assets[newAssetId - 1];

		// Instantly approve it by the sender
		asset.hasApprovedAdd[msg.sender] = true;

		emit AssetProposed(now, _data, msg.sender);
	}

	/**
	 * @dev Approve the addition of a prior proposed asset. The other spouse needs to approve this action.
	 */
	function approveAsset(uint _assetId) external onlySpouse isSigned isNotDivorced {
		require(_assetId > 0 && _assetId <= assets.length, "Invalid asset id!");

		Asset storage asset = assets[_assetId - 1];

		require(asset.added == false, "Asset has already been added!");
		require(asset.removed == false, "Asset has already been removed!");
		require(asset.hasApprovedAdd[msg.sender] == false, "Asset has already approved by sender!");

		// Sender approved
		asset.hasApprovedAdd[msg.sender] = true;

		emit AssetAddApproved(now, asset.data, msg.sender);

		// Check if both spouses have approved
		if (asset.hasApprovedAdd[husbandAddress] && asset.hasApprovedAdd[wifeAddress]) {
			asset.added = true;
			emit AssetAdded(now, asset.data);
		}
	}

	/**
	 * @dev Approve the removal of a prior proposed/already added asset. The other spouse needs to approve this action.
	 */
	function removeAsset(uint _assetId) external onlySpouse isSigned isNotDivorced {
		require(_assetId > 0 && _assetId <= assets.length, "Invalid asset id!");

		Asset storage asset = assets[_assetId - 1];
		require(asset.added, "Asset has not been added yet!");
		require(asset.removed == false, "Asset has already been removed!");
		require(asset.hasApprovedRemove[msg.sender] == false, "Removing the asset has already been approved by the sender!");

		// Approve removal by the sender
		asset.hasApprovedRemove[msg.sender] = true;

		emit AssetRemoveApproved(now, asset.data, msg.sender);

		// Check if both spouses have approved the removal of the asset
		if (asset.hasApprovedRemove[husbandAddress] && asset.hasApprovedRemove[wifeAddress]) {
			asset.removed = true;
			emit AssetRemoved(now, asset.data);
		}
	}

	/**
	 * @dev Request to divorce. The other spouse needs to approve this action.
	 */
	function divorce() external onlySpouse isSigned isNotDivorced {
		require(hasDivorced[msg.sender] == false, "Sender has already approved to divorce!");

		// Sender approved
		hasDivorced[msg.sender] = true;

		emit DivorceApproved(now, msg.sender);

		// Check if both spouses have approved to divorce
		if (hasDivorced[husbandAddress] && hasDivorced[wifeAddress]) {
			divorced = true;
			emit Divorced(now);

			// Get the contracts balance
			uint balance = address(this).balance;

			// Split the remaining balance half-half
			if (balance != 0) {
				uint balancePerSpouse = balance / 2;

				// Send transfer to the husband
				husbandAddress.transfer(balancePerSpouse);
				emit Sent(now, husbandAddress, balancePerSpouse);

				// Send transfer to the wife
				wifeAddress.transfer(balancePerSpouse);
				emit Sent(now, wifeAddress, balancePerSpouse);
			}
		}
	}

	/**
	 * @dev Return a list of all asset ids.
	 */
	function getAssetIds() external view onlySpouse returns (uint[]) {
		uint assetCount = assets.length;
		uint[] memory assetIds = new uint[](assetCount);

		// Get all asset ids
		for (uint i = 1; i <= assetCount; i++) { assetIds[i - 1] = i; }

		return assetIds;
	}
}
