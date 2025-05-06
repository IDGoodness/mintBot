// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockNFT
 * @dev A simple mock NFT contract for testing
 */
contract MockNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    uint256 public mintPrice;
    bool public mintingEnabled;
    
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
        Ownable(msg.sender) 
    {}
    
    // Allow the owner to set mint price
    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }
    
    // Allow the owner to toggle minting
    function toggleMinting(bool _enabled) external onlyOwner {
        mintingEnabled = _enabled;
    }
    
    // Standard mint function that takes quantity
    function mint(uint256 quantity) external payable returns (uint256) {
        require(mintingEnabled, "Minting is not enabled");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        uint256 startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }
        
        return startTokenId;
    }
    
    // Mint to a specific address (for testing alternative mint methods)
    function mintTo(address to, uint256 quantity) external payable returns (uint256) {
        require(mintingEnabled, "Minting is not enabled");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        uint256 startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
        }
        
        return startTokenId;
    }
    
    // Alternative mint function name for testing signature detection
    function publicMint(uint256 quantity) external payable returns (uint256) {
        require(mintingEnabled, "Minting is not enabled");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        uint256 startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }
        
        return startTokenId;
    }
    
    // Withdraw contract balance
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
} 