pragma solidity ^0.4.24;

import "./zeppelin/math/SafeMath.sol";

contract SmartWeddingContract {
	using SafeMath for uint256;

	event Signed();
	event AssetSuggested(uint id);
	event AssetAddConfirmed(uint id);
	event AssetAdded(uint id);
	event AssetRemoveConfirmed(uint id);
	event AssetRemoved(uint id);
	event DivorceConfirmed();
	event Divorced();
	event FundsSent();

	bool public divorced = false;

	struct Asset {
		string data;
		bool added;
		bool removed;
		mapping (address => bool) addConfirmations;
		mapping (address => bool) removeConfirmations;
	}

	address public husbandAddress;
	address public wifeAddress;
	string public writtenContractId;

	Asset[] public assets;

	mapping (address => bool) public divorceConfirmations;

	modifier onlySpouse() {
		require(msg.sender == husbandAddress || msg.sender == wifeAddress, "Sender is not a spouse");
		_;
	}

	modifier isMarried() {
		require(divorced == false, "Can not be called after dissolution");
		_;
	}

	modifier isValidAssetId(uint _assetId) {
		require(_assetId > 0 && _assetId <= assets.length, "Invalid asset id");
		_;
	}

	constructor(address _husbandAddress, address _wifeAddress, string _writtenContractId) public {
		require(_husbandAddress != address(0), "Husbands address must not be null");
		require(_wifeAddress != address(0), "Wife address must not be null");
		require(_husbandAddress != _wifeAddress, "Husband address must not equal wife address");
		require(keccak256(abi.encodePacked(_writtenContractId)) != keccak256(abi.encodePacked("")), "Written contract id must not be empty");

		husbandAddress = _husbandAddress;
		wifeAddress = _wifeAddress;
		writtenContractId = _writtenContractId;

		emit Signed();
	}

	function () public payable {}

	function suggestAsset(string _data) external onlySpouse isMarried {
		require(keccak256(abi.encodePacked(_data)) != keccak256(abi.encodePacked("")), "Invalid asset");

		uint id = assets.push(Asset(_data, false, false));
		Asset storage asset = assets[id - 1];
		asset.addConfirmations[msg.sender] = true;

		emit AssetSuggested(id);
	}

	function addAsset(uint _assetId) external onlySpouse isMarried isValidAssetId(_assetId) {
		Asset storage asset = assets[_assetId - 1];
		require(asset.added == false, "Asset has already been added");
		require(asset.removed == false, "Asset has already been removed");
		require(asset.addConfirmations[msg.sender] == false, "Adding this asset has already been confirmed by spouse");
		asset.addConfirmations[msg.sender] = true;

		emit AssetAddConfirmed(_assetId);

		bool addConfirmedByHusband = asset.addConfirmations[husbandAddress];
		bool addConfirmedByWife = asset.addConfirmations[wifeAddress];

		if (addConfirmedByHusband && addConfirmedByWife) {
			asset.added = true;
			emit AssetAdded(_assetId);
		}
	}

	function removeAsset(uint _assetId) external onlySpouse isMarried isValidAssetId(_assetId) {
		Asset storage asset = assets[_assetId - 1];
		require(asset.added, "Asset has not been added yet");
		require(asset.removed == false, "Asset has already been removed");
		require(asset.removeConfirmations[msg.sender] == false, "Removing this asset has already been confirmed by spouse");
		asset.removeConfirmations[msg.sender] = true;

		emit AssetRemoveConfirmed(_assetId);

		bool removeConfirmedByHusband = asset.removeConfirmations[husbandAddress];
		bool removeConfirmedByWife = asset.removeConfirmations[wifeAddress];

		if (removeConfirmedByHusband && removeConfirmedByWife) {
			asset.removed = true;
			emit AssetRemoved(_assetId);
		}
	}

	function divorce() external onlySpouse isMarried {
		require(divorceConfirmations[msg.sender] == false, "Spouse has already requested dissolution");

		divorceConfirmations[msg.sender] = true;

		bool divorceConfirmedByHusband = divorceConfirmations[husbandAddress];
		bool divorceConfirmedByWife = divorceConfirmations[wifeAddress];

		emit DivorceConfirmed();

		if (divorceConfirmedByHusband && divorceConfirmedByWife) {
			divorced = true;
			emit Divorced();

			uint balance = address(this).balance;

			if (balance != 0) {
				uint balancePerSpouse = balance.div(2);
				require(husbandAddress.send(balancePerSpouse));
				require(wifeAddress.send(balancePerSpouse));

				emit FundsSent();
			}
		}
	}

	function getAssetIds() external view returns (uint[]) {
		uint[] memory assetIds = new uint[](assets.length);

		for (uint i = 1; i <= assets.length; i++) {
			assetIds[i - 1] = i;
		}

		return assetIds;
	}
}
