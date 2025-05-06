// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleMockNFT
 * @dev A bare-bones implementation of ERC721 for testing, without external dependencies
 */
contract SimpleMockNFT {
    // Token name
    string private _name;
    
    // Token symbol
    string private _symbol;
    
    // Mint price
    uint256 public mintPrice;
    
    // Minting enabled flag
    bool public mintingEnabled;
    
    // Owner
    address private _owner;
    
    // Token ID counter
    uint256 private _nextTokenId;
    
    // Mapping from token ID to owner address
    mapping(uint256 => address) private _owners;
    
    // Mapping owner address to token count
    mapping(address => uint256) private _balances;
    
    // Mapping from token ID to approved address
    mapping(uint256 => address) private _tokenApprovals;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    
    /**
     * @dev Constructor initializes the name and symbol
     */
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
        _owner = msg.sender;
    }
    
    /**
     * @dev Returns the name of the token
     */
    function name() public view returns (string memory) {
        return _name;
    }
    
    /**
     * @dev Returns the symbol of the token
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }
    
    /**
     * @dev Returns the number of tokens owned by an account
     */
    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");
        return _balances[owner];
    }
    
    /**
     * @dev Returns the owner of a token
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: owner query for nonexistent token");
        return owner;
    }
    
    /**
     * @dev Set mint price (only owner)
     */
    function setMintPrice(uint256 _price) external {
        require(msg.sender == _owner, "Only owner can set mint price");
        mintPrice = _price;
    }
    
    /**
     * @dev Toggle minting (only owner)
     */
    function toggleMinting(bool _enabled) external {
        require(msg.sender == _owner, "Only owner can toggle minting");
        mintingEnabled = _enabled;
    }
    
    /**
     * @dev Mint new tokens
     */
    function mint(uint256 quantity) external payable returns (uint256) {
        require(mintingEnabled, "Minting is not enabled");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        uint256 startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _mint(msg.sender, tokenId);
        }
        
        return startTokenId;
    }
    
    /**
     * @dev Mint to a specific address
     */
    function mintTo(address to, uint256 quantity) external payable returns (uint256) {
        require(mintingEnabled, "Minting is not enabled");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        uint256 startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _mint(to, tokenId);
        }
        
        return startTokenId;
    }
    
    /**
     * @dev Public mint function
     */
    function publicMint(uint256 quantity) external payable returns (uint256) {
        require(mintingEnabled, "Minting is not enabled");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        
        uint256 startTokenId = _nextTokenId;
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _mint(msg.sender, tokenId);
        }
        
        return startTokenId;
    }
    
    /**
     * @dev Internal mint function
     */
    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");
        
        _balances[to] += 1;
        _owners[tokenId] = to;
        
        emit Transfer(address(0), to, tokenId);
    }
    
    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external {
        require(msg.sender == _owner, "Only owner can withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = payable(_owner).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Check if a token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _owners[tokenId] != address(0);
    }
    
    /**
     * @dev Return owner address
     */
    function owner() public view returns (address) {
        return _owner;
    }
    
    // This makes it easily compatible with ERC721Receiver interface without actually implementing it
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    /**
     * @dev Approve another address to transfer the token
     */
    function approve(address to, uint256 tokenId) external {
        address owner = _owners[tokenId];
        require(to != owner, "ERC721: approval to current owner");
        require(msg.sender == owner, "ERC721: approve caller is not owner");
        
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }
    
    /**
     * @dev Get the approved address for a token
     */
    function getApproved(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "ERC721: approved query for nonexistent token");
        return _tokenApprovals[tokenId];
    }
    
    /**
     * @dev Transfer a token from one address to another
     */
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: transfer caller is not owner nor approved");
        require(from == _owners[tokenId], "ERC721: transfer of token that is not owned");
        require(to != address(0), "ERC721: transfer to the zero address");
        
        // Clear approvals
        _tokenApprovals[tokenId] = address(0);
        
        // Update balances
        _balances[from] -= 1;
        _balances[to] += 1;
        
        // Update ownership
        _owners[tokenId] = to;
        
        emit Transfer(from, to, tokenId);
    }
    
    /**
     * @dev Safe transfer with additional data
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        transferFrom(from, to, tokenId);
        
        // Check if recipient is a contract and can receive ERC721 tokens
        if (_isContract(to)) {
            try SimpleMockNFT(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                require(retval == SimpleMockNFT(to).onERC721Received.selector, "ERC721: transfer to non ERC721Receiver implementer");
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
    }
    
    /**
     * @dev Safe transfer without additional data
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        // Call the internal implementation directly instead of recursively calling the external function
        transferFrom(from, to, tokenId);
        
        // Check if recipient is a contract and can receive ERC721 tokens
        if (_isContract(to)) {
            try SimpleMockNFT(to).onERC721Received(msg.sender, from, tokenId, "") returns (bytes4 retval) {
                require(retval == SimpleMockNFT(to).onERC721Received.selector, "ERC721: transfer to non ERC721Receiver implementer");
            } catch (bytes memory reason) {
                if (reason.length == 0) {
                    revert("ERC721: transfer to non ERC721Receiver implementer");
                } else {
                    assembly {
                        revert(add(32, reason), mload(reason))
                    }
                }
            }
        }
    }
    
    /**
     * @dev Check if address is a contract
     */
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
    
    /**
     * @dev Check if the spender is the owner or approved
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        require(_exists(tokenId), "ERC721: operator query for nonexistent token");
        address owner = _owners[tokenId];
        return (spender == owner || spender == _tokenApprovals[tokenId] || spender == _owner);
    }
} 