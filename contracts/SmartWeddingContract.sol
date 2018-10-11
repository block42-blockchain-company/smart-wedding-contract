pragma solidity ^0.4.24;

import "./zeppelin/math/SafeMath.sol";


/**
 * @title SmartWeddingContract
 * @dev The contract has both addresses of the husband and the wife. It is capable of handling assets, funds and
 * dissolution. A multisig variant is used to consider the decision of both parties.
 */
contract SmartWeddingContract {
	using SafeMath for uint256;

	event Signed();
	event AssetSuggested(uint id);
	event AssetAddApproved(uint id);
	event AssetAdded(uint id);
	event AssetRemoveApproved(uint id);
	event AssetRemoved(uint id);
	event DivorceApproved();
	event Divorced();
	event FundsSent();

	bool public divorced = false;

	struct Asset {
		string data;
		bool added;
		bool removed;
		mapping (address => bool) addApprovals;
		mapping (address => bool) removeApprovals;
	}

	address public husbandAddress;
	address public wifeAddress;
	string public writtenContractId;

	Asset[] public assets;

	mapping (address => bool) public divorceApprovals;

	/**
	 * @dev Modifier that only allows spouse execution.
 	 */
	modifier onlySpouse() {
		require(msg.sender == husbandAddress || msg.sender == wifeAddress, "Sender is not a spouse");
		_;
	}

	/**
	 * @dev Modifier that only allows execution if the marriage is still intact.
 	 */
	modifier isMarried() {
		require(divorced == false, "Can not be called after dissolution");
		_;
	}

	/**
	 * @dev Modifier that validates an asset id.
 	 */
	modifier isValidAssetId(uint _assetId) {
		require(_assetId > 0 && _assetId <= assets.length, "Invalid asset id");
		_;
	}

	/**
	 * @dev Internal helper function to check if a string is the same as another.
	 */
	function isSameString(string string1, string string2) internal pure returns (bool) {
		return keccak256(abi.encodePacked(string1)) != keccak256(abi.encodePacked(string2));
	}

	/**
	 * @dev Constructor sets the addresses of both spouses and the id of the written wedding contract.
	 * @param _writtenContractId IPFS hash of the written wedding contract.
	 */
	constructor(address _husbandAddress, address _wifeAddress, string _writtenContractId) public {
		require(_husbandAddress != address(0), "Husbands address must not be null");
		require(_wifeAddress != address(0), "Wife address must not be null");
		require(_husbandAddress != _wifeAddress, "Husband address must not equal wife address");
		require(isSameString(_writtenContractId, ""), "Written contract id must not be empty");

		husbandAddress = _husbandAddress;
		wifeAddress = _wifeAddress;
		writtenContractId = _writtenContractId;

		emit Signed();
	}

	/**
	 * @dev Default function to enable sending funds to the contract.
 	 */
	function () public payable {}

	/**
	 * @dev Suggest to add an asset. The other spouse needs to approve this action.
	 * @param _data The asset represented as an encrypted data string to ensure privacy.
	 */
	function suggestAsset(string _data) external onlySpouse isMarried {
		require(isSameString(_data, ""), "Invalid asset");

		// Add a new asset and instantly approve it by the sender
		uint id = assets.push(Asset(_data, false, false));
		Asset storage asset = assets[id - 1];
		asset.addApprovals[msg.sender] = true;

		emit AssetSuggested(id);
	}

	/**
	 * @dev Approve the addition of a prior suggested asset. The other spouse needs to approve this action.
	 */
	function addAsset(uint _assetId) external onlySpouse isMarried isValidAssetId(_assetId) {
		Asset storage asset = assets[_assetId - 1];
		require(asset.added == false, "Asset has already been added");
		require(asset.removed == false, "Asset has already been removed");
		require(asset.addApprovals[msg.sender] == false, "Adding this asset has already been approved by the spouse");

		// Approve addition by the sender
		asset.addApprovals[msg.sender] = true;

		emit AssetAddApproved(_assetId);

		bool addApprovedByHusband = asset.addApprovals[husbandAddress];
		bool addApprovedByWife = asset.addApprovals[wifeAddress];

		// Check if both spouses have approved the addition of the asset
		if (addApprovedByHusband && addApprovedByWife) {
			asset.added = true;
			emit AssetAdded(_assetId);
		}
	}

	/**
	 * @dev Approve the removal of a prior suggested/already added asset. The other spouse needs to approve this action.
	 */
	function removeAsset(uint _assetId) external onlySpouse isMarried isValidAssetId(_assetId) {
		Asset storage asset = assets[_assetId - 1];
		require(asset.added, "Asset has not been added yet");
		require(asset.removed == false, "Asset has already been removed");
		require(asset.removeApprovals[msg.sender] == false, "Removing this asset has already been approved by the spouse");

		// Approve removal by the sender
		asset.removeApprovals[msg.sender] = true;

		emit AssetRemoveApproved(_assetId);

		bool removeApprovedByHusband = asset.removeApprovals[husbandAddress];
		bool removeApprovedByWife = asset.removeApprovals[wifeAddress];

		// Check if both spouses have approved the removal of the asset
		if (removeApprovedByHusband && removeApprovedByWife) {
			asset.removed = true;
			emit AssetRemoved(_assetId);
		}
	}

	/**
	 * @dev Request to divorce. The other spouse needs to approve this action.
	 */
	function divorce() external onlySpouse isMarried {
		require(divorceApprovals[msg.sender] == false, "Spouse has already approved to divorce");

		// Approve to divorce by the sender
		divorceApprovals[msg.sender] = true;

		bool divorceApprovedByHusband = divorceApprovals[husbandAddress];
		bool divorceApprovedByWife = divorceApprovals[wifeAddress];

		emit DivorceApproved();

		// Check if both spouses have approved to divorce
		if (divorceApprovedByHusband && divorceApprovedByWife) {
			divorced = true;
			emit Divorced();

			uint balance = address(this).balance;

			if (balance != 0) {
				// Split the remaining balance of the contract 50:50
				uint balancePerSpouse = balance.div(2);
				require(husbandAddress.send(balancePerSpouse));
				require(wifeAddress.send(balancePerSpouse));

				emit FundsSent();
			}
		}
	}

	/**
	 * @dev Return a list of all asset ids.
	 */
	function getAssetIds() external view returns (uint[]) {
		uint[] memory assetIds = new uint[](assets.length);

		for (uint i = 1; i <= assets.length; i++) {
			assetIds[i - 1] = i;
		}

		return assetIds;
	}
}
