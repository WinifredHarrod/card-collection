// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ChainCard — On-chain interest card NFT with FHE popularity
/// @notice Implements mint/collect/transfer plus FHE-encrypted popularity per card.
/// @dev FHE usage mirrors Zama template: fromExternal(), FHE.add/sub, FHE.allow/allowThis.
contract CardCollection is ERC721, ERC721Enumerable, Ownable, SepoliaConfig {
    struct CardMeta {
        string name;
        string description;
        string image;
        string[] tags;
    }

    uint256 private _nextTokenId;

    mapping(uint256 => CardMeta) private _metadata;
    mapping(uint256 => euint32) private _popularity; // encrypted popularity score per card

    // favorites per user
    mapping(address => mapping(uint256 => bool)) private _isFavorite;
    mapping(address => uint256[]) private _favorites;

    event Minted(address indexed to, uint256 indexed tokenId);
    event Collected(address indexed from, address indexed to, uint256 indexed tokenId);
    event PopularityUpdated(uint256 indexed tokenId, bool increment);

    constructor() ERC721("ChainCard", "CCARD") Ownable(msg.sender) {}

    // ----------------------
    // Mint / Transfer
    // ----------------------

    function mint(
        string memory name_,
        string memory description_,
        string memory image_,
        string[] memory tags_
    ) external returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);

        _metadata[tokenId] = CardMeta({
            name: name_,
            description: description_,
            image: image_,
            tags: tags_
        });

        // init encrypted popularity to 0
        _popularity[tokenId] = FHE.asEuint32(0);

        // Allow decrypt by contract and owner for initial handle
        FHE.allowThis(_popularity[tokenId]);
        FHE.allow(_popularity[tokenId], msg.sender);

        emit Minted(msg.sender, tokenId);
    }

    /// @notice Transfer NFT to another user (collect/transfer)
    function collect(address to, uint256 tokenId) external {
        safeTransferFrom(msg.sender, to, tokenId);

        // Refresh decryption permissions for the new owner
        FHE.allowThis(_popularity[tokenId]);
        FHE.allow(_popularity[tokenId], to);

        emit Collected(msg.sender, to, tokenId);
    }

    /// @notice Exchange two tokens between msg.sender and `other`.
    /// @dev Requires both parties to have approved this contract or each other appropriately.
    function exchange(address other, uint256 myTokenId, uint256 theirTokenId) external {
        require(ownerOf(myTokenId) == msg.sender, "Not owner of myTokenId");
        require(ownerOf(theirTokenId) == other, "Other not owner of theirTokenId");

        // Transfers require prior approvals
        safeTransferFrom(msg.sender, other, myTokenId);
        safeTransferFrom(other, msg.sender, theirTokenId);

        // Refresh decrypt permissions for both tokens to their new owners
        FHE.allowThis(_popularity[myTokenId]);
        FHE.allow(_popularity[myTokenId], other);
        FHE.allowThis(_popularity[theirTokenId]);
        FHE.allow(_popularity[theirTokenId], msg.sender);
    }

    // ----------------------
    // Read metadata
    // ----------------------

    function getCardMeta(uint256 tokenId)
        external
        view
        returns (
            string memory name_,
            string memory description_,
            string memory image_,
            string[] memory tags_
        )
    {
        _requireOwned(tokenId);
        CardMeta storage m = _metadata[tokenId];
        return (m.name, m.description, m.image, m.tags);
    }

    /// @notice Returns the list of tokenIds owned by `owner_`.
    function tokensOfOwner(address owner_) external view returns (uint256[] memory) {
        uint256 count = balanceOf(owner_);
        uint256[] memory ids = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = tokenOfOwnerByIndex(owner_, i);
        }
        return ids;
    }

    // ----------------------
    // FHE Popularity
    // ----------------------

    /// @notice Returns the current encrypted popularity handle
    function getPopularity(uint256 tokenId) external view returns (euint32) {
        _requireOwned(tokenId);
        return _popularity[tokenId];
    }

    /// @notice Increase popularity by an encrypted amount
    /// @param inputEuint32 encrypted uint32 amount
    /// @param inputProof input proof as produced by frontend instance.createEncryptedInput
    function increasePopularity(
        uint256 tokenId,
        externalEuint32 inputEuint32,
        bytes calldata inputProof
    ) external {
        _requireOwned(tokenId);
        // Anyone can like; owner-only can also like; flexible policy

        euint32 value = FHE.fromExternal(inputEuint32, inputProof);
        _popularity[tokenId] = FHE.add(_popularity[tokenId], value);

        // Allow decrypt for contract (relayer) and token owner
        FHE.allowThis(_popularity[tokenId]);
        FHE.allow(_popularity[tokenId], ownerOf(tokenId));

        emit PopularityUpdated(tokenId, true);
    }

    /// @notice Decrease popularity by an encrypted amount
    function decreasePopularity(
        uint256 tokenId,
        externalEuint32 inputEuint32,
        bytes calldata inputProof
    ) external {
        _requireOwned(tokenId);
        euint32 value = FHE.fromExternal(inputEuint32, inputProof);
        _popularity[tokenId] = FHE.sub(_popularity[tokenId], value);

        FHE.allowThis(_popularity[tokenId]);
        FHE.allow(_popularity[tokenId], ownerOf(tokenId));

        emit PopularityUpdated(tokenId, false);
    }

    // ----------------------
    // Favorites
    // ----------------------

    function favoriteAdd(uint256 tokenId) external {
        _requireOwned(tokenId);
        if (_isFavorite[msg.sender][tokenId]) return;
        _isFavorite[msg.sender][tokenId] = true;
        _favorites[msg.sender].push(tokenId);
    }

    function favoriteRemove(uint256 tokenId) external {
        if (!_isFavorite[msg.sender][tokenId]) return;
        _isFavorite[msg.sender][tokenId] = false;
        uint256[] storage list = _favorites[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == tokenId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
    }

    function getFavorites(address user) external view returns (uint256[] memory) {
        return _favorites[user];
    }

    // ----------------------
    // Overrides
    // ----------------------

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}


