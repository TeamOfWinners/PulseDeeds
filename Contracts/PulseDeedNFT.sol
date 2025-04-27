// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PulseDeedNFT is ERC721URIStorage, Ownable {
    // Public counter for token IDs
    uint256 public nextTokenId;
    
    // Fee structure (0.3% = 30 basis points)
    uint256 public constant FEE_BASIS_POINTS = 30;
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;
    
    // Base fee for minting in PLS (0.01 PLS)
    uint256 public mintBaseFee = 0.01 ether;
    
    // Optional property value for calculating percentage fees
    mapping(uint256 => uint256) public deedValues;
    
    // Events
    event DeedMinted(uint256 tokenId, address owner, string tokenURI, uint256 fee);
    event DeedTransferred(uint256 tokenId, address from, address to, uint256 fee);
    event DeedValueSet(uint256 tokenId, uint256 value);
    event MintBaseFeeUpdated(uint256 newFee);
    event FeesWithdrawn(address to, uint256 amount);
    
    constructor() ERC721("PulseDeedNFT", "DEED") Ownable(msg.sender) {}
    
    /**
     * @dev Mints a new deed NFT
     * @param to The address that will own the minted deed
     * @param tokenURI The metadata URI for the deed
     * @param propertyValue The value of the property (optional, can be 0)
     * @return The ID of the newly minted token
     */
    function mintDeed(address to, string memory tokenURI, uint256 propertyValue) public payable returns (uint256) {
        // Calculate fee based on property value or use base fee
        uint256 fee = calculateMintFee(propertyValue);
        
        // Ensure sent value is enough to cover the fee
        require(msg.value >= fee, "Insufficient fee");
        
        uint256 tokenId = nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Store property value if provided
        if (propertyValue > 0) {
            deedValues[tokenId] = propertyValue;
            emit DeedValueSet(tokenId, propertyValue);
        }
        
        nextTokenId++;
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        emit DeedMinted(tokenId, to, tokenURI, fee);
        
        return tokenId;
    }
    
    /**
     * @dev Transfers a deed NFT from one address to another
     * @param from The current owner of the deed
     * @param to The new owner of the deed
     * @param tokenId The ID of the deed to transfer
     * @param propertyValue New property value (optional, can be 0 to keep existing)
     */
    function transferDeed(address from, address to, uint256 tokenId, uint256 propertyValue) public payable {
        // Check that sender is owner or approved
        require(
            _isAuthorized(from, msg.sender, tokenId),
            "PulseDeedNFT: caller is not owner nor approved"
        );
        
        // Get current value or use new value
        uint256 currentValue = propertyValue > 0 ? propertyValue : deedValues[tokenId];
        
        // Calculate fee based on property value
        uint256 fee = calculateTransferFee(currentValue);
        
        // Ensure sent value is enough to cover the fee
        require(msg.value >= fee, "Insufficient fee");
        
        // Update property value if changed
        if (propertyValue > 0 && propertyValue != deedValues[tokenId]) {
            deedValues[tokenId] = propertyValue;
            emit DeedValueSet(tokenId, propertyValue);
        }
        
        // Transfer the token
        _transfer(from, to, tokenId);
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        emit DeedTransferred(tokenId, from, to, fee);
    }
    
    /**
     * @dev Calculate the mint fee based on property value
     * @param propertyValue The value of the property
     * @return The fee amount
     */
    function calculateMintFee(uint256 propertyValue) public view returns (uint256) {
        if (propertyValue == 0) {
            return mintBaseFee;
        }
        
        uint256 percentageFee = (propertyValue * FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
        
        // Use the larger of base fee or percentage fee
        return percentageFee > mintBaseFee ? percentageFee : mintBaseFee;
    }
    
    /**
     * @dev Calculate the transfer fee based on property value
     * @param propertyValue The value of the property
     * @return The fee amount
     */
    function calculateTransferFee(uint256 propertyValue) public view returns (uint256) {
        if (propertyValue == 0) {
            return mintBaseFee / 2; // Half the base fee for transfers
        }
        
        uint256 percentageFee = (propertyValue * FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
        uint256 minimumFee = mintBaseFee / 2;
        
        // Use the larger of minimum fee or percentage fee
        return percentageFee > minimumFee ? percentageFee : minimumFee;
    }
    
    /**
     * @dev Get the estimated fee for minting
     * @param propertyValue The value of the property
     * @return The estimated fee
     */
    function estimateMintFee(uint256 propertyValue) external view returns (uint256) {
        return calculateMintFee(propertyValue);
    }
    
    /**
     * @dev Get the estimated fee for transferring
     * @param tokenId The token ID to transfer
     * @param newValue Optional new property value
     * @return The estimated fee
     */
    function estimateTransferFee(uint256 tokenId, uint256 newValue) external view returns (uint256) {
        uint256 valueToUse = newValue > 0 ? newValue : deedValues[tokenId];
        return calculateTransferFee(valueToUse);
    }
    
    /**
     * @dev Set a new base fee for minting
     * @param newFee The new base fee
     */
    function setMintBaseFee(uint256 newFee) external onlyOwner {
        mintBaseFee = newFee;
        emit MintBaseFeeUpdated(newFee);
    }
    
    /**
     * @dev Withdraw accumulated fees to owner
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        payable(owner()).transfer(balance);
        emit FeesWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Get property details including value and fees
     * @param tokenId The token ID
     * @return exists Whether the token exists
     * @return uri The token URI
     * @return value The property value
     * @return transferFee The fee to transfer this deed
     */
    function getDeedDetails(uint256 tokenId) external view returns (
        bool exists,
        string memory uri,
        uint256 value,
        uint256 transferFee
    ) {
        exists = _ownerOf(tokenId) != address(0);
        if (exists) {
            uri = tokenURI(tokenId);
            value = deedValues[tokenId];
            transferFee = calculateTransferFee(value);
        }
        return (exists, uri, value, transferFee);
    }
    
    // Required to receive PLS
    receive() external payable {}
}
