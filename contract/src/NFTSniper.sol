// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NFTSniper
 * @dev A contract to execute high-speed minting of NFTs as soon as they launch
 */
contract NFTSniper is Ownable, ReentrancyGuard, IERC721Receiver {
    // Events
    event MintingAttempt(address indexed nftContract, uint256 mintPrice, bool success);
    event FundsDeposited(address indexed user, uint256 amount);
    event FundsWithdrawn(address indexed user, uint256 amount);
    event TargetContractAdded(address indexed nftContract, bytes4 mintSignature);
    event NFTReceived(address operator, address from, uint256 tokenId, bytes data);
    
    // Structs
    struct MintConfig {
        bytes4 mintSignature;    // Function signature for the mint function
        uint256 maxGasPrice;     // Maximum gas price willing to pay (in wei)
        uint256 maxMintPrice;    // Maximum price willing to pay per NFT (in wei)
        bool active;             // Whether this target is active
    }
    
    // Mapping of user address => target NFT contract address => mint configuration
    mapping(address => mapping(address => MintConfig)) public mintConfigurations;
    
    // Mapping of user address => deposited ETH balance
    mapping(address => uint256) public userBalances;
    
    // Common mint function signatures
    bytes4 private constant MINT_SIG = bytes4(keccak256("mint(uint256)"));
    bytes4 private constant MINT_TO_SIG = bytes4(keccak256("mintTo(address,uint256)"));
    bytes4 private constant PUBLIC_MINT_SIG = bytes4(keccak256("publicMint(uint256)"));
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Required for ERC721 receiver interface
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        emit NFTReceived(operator, from, tokenId, data);
        return IERC721Receiver.onERC721Received.selector;
    }
    
    /**
     * @dev Set up a target NFT contract to be sniped
     * @param nftContract The address of the NFT contract
     * @param mintSig The function signature for minting (use 0 for auto-detection)
     * @param maxGasPrice The maximum gas price willing to pay in gwei
     * @param maxMintPrice The maximum price willing to pay per NFT in wei
     */
    function setupTarget(
        address nftContract,
        bytes4 mintSig,
        uint256 maxGasPrice,
        uint256 maxMintPrice
    ) external {
        require(nftContract != address(0), "Invalid NFT contract address");
        
        // If mintSig is 0, try to auto-detect the mint function
        bytes4 finalMintSig = mintSig;
        if (mintSig == bytes4(0)) {
            // Try common mint signatures
            if (_functionExists(nftContract, MINT_SIG)) {
                finalMintSig = MINT_SIG;
            } else if (_functionExists(nftContract, MINT_TO_SIG)) {
                finalMintSig = MINT_TO_SIG;
            } else if (_functionExists(nftContract, PUBLIC_MINT_SIG)) {
                finalMintSig = PUBLIC_MINT_SIG;
            } else {
                revert("Could not auto-detect mint function");
            }
        }
        
        mintConfigurations[msg.sender][nftContract] = MintConfig({
            mintSignature: finalMintSig,
            maxGasPrice: maxGasPrice,
            maxMintPrice: maxMintPrice,
            active: true
        });
        
        emit TargetContractAdded(nftContract, finalMintSig);
    }
    
    /**
     * @dev Deposit ETH to be used for minting
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit some ETH");
        userBalances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Withdraw ETH from the contract
     * @param amount The amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= userBalances[msg.sender], "Insufficient balance");
        
        userBalances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit FundsWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Execute a mint on the target NFT contract
     * @param nftContract The address of the NFT contract
     * @param quantity The number of NFTs to mint
     * @param mintPrice The price per NFT
     * @param gasPrice The gas price to use for the transaction (not used currently but kept for interface compatibility)
     */
    function executeMint(
        address nftContract,
        uint256 quantity,
        uint256 mintPrice,
        uint256 gasPrice
    ) external nonReentrant {
        MintConfig memory config = mintConfigurations[msg.sender][nftContract];
        require(config.active, "Target not active");
        require(tx.gasprice <= config.maxGasPrice, "Gas price too high");
        require(mintPrice <= config.maxMintPrice, "Mint price too high");
        
        uint256 totalCost = mintPrice * quantity;
        require(userBalances[msg.sender] >= totalCost, "Insufficient funds");
        
        userBalances[msg.sender] -= totalCost;
        
        bool success = false;
        bytes4 mintSig = config.mintSignature;
        
        if (mintSig == MINT_SIG) {
            success = _executeMint(nftContract, quantity, totalCost, msg.sender);
        } else if (mintSig == MINT_TO_SIG) {
            success = _executeMintTo(nftContract, msg.sender, quantity, totalCost);
        } else if (mintSig == PUBLIC_MINT_SIG) {
            success = _executePublicMint(nftContract, quantity, totalCost, msg.sender);
        } else {
            success = _executeCustomMint(nftContract, mintSig, quantity, totalCost, msg.sender);
        }
        
        if (!success) {
            userBalances[msg.sender] += totalCost;
        }
        
        emit MintingAttempt(nftContract, mintPrice, success);
    }
    
    /**
     * @dev Activate or deactivate a target
     * @param nftContract The NFT contract address
     * @param active Whether the target should be active
     */
    function setTargetActive(address nftContract, bool active) external {
        require(mintConfigurations[msg.sender][nftContract].mintSignature != bytes4(0), "Target not set up");
        mintConfigurations[msg.sender][nftContract].active = active;
    }
    
    /**
     * @dev Check if a function exists on a contract
     * @param _contract The contract address
     * @param _functionSig The function signature
     * @return Whether the function exists
     */
    function _functionExists(address _contract, bytes4 _functionSig) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_contract)
        }
        if (size == 0) return false;
        
        bytes memory callData;
        
        if (_functionSig == MINT_SIG || _functionSig == PUBLIC_MINT_SIG) {
            callData = abi.encodeWithSelector(_functionSig, uint256(1));
        } else if (_functionSig == MINT_TO_SIG) {
            callData = abi.encodeWithSelector(_functionSig, address(this), uint256(1));
        } else {
            callData = abi.encodeWithSelector(_functionSig, uint256(1));
        }
        
        bytes memory contractCode;
        assembly {
            let codeSize := size
            contractCode := mload(0x40)
            mstore(0x40, add(contractCode, add(codeSize, 0x20)))
            mstore(contractCode, codeSize)
            extcodecopy(_contract, add(contractCode, 0x20), 0, codeSize)
        }
        
        bytes4 selector = bytes4(callData);
        
        for (uint i = 0; i < contractCode.length - 3; i++) {
            bytes4 codeSelector;
            assembly {
                codeSelector := mload(add(add(contractCode, 0x20), i))
            }
            
            codeSelector = bytes4(codeSelector);
            if (codeSelector == selector) {
                return true;
            }
        }
        
        (bool success, ) = _contract.staticcall(callData);
        return success;
    }
    
    function _executeMint(address nftContract, uint256 quantity, uint256 value, address minter) private returns (bool) {
        uint256 beforeBalance = 0;
        try IERC721(nftContract).balanceOf(minter) returns (uint256 balance) {
            beforeBalance = balance;
        } catch {
        }
        
        (bool success, ) = nftContract.call{value: value}(
            abi.encodeWithSelector(MINT_SIG, quantity)
        );
        
        if (success) {
            try IERC721(nftContract).balanceOf(minter) returns (uint256 afterBalance) {
                if (afterBalance > beforeBalance) {
                    return true;
                }
                
                try IERC721(nftContract).balanceOf(address(this)) returns (uint256 contractBalance) {
                    if (contractBalance > 0) {
                        for (uint256 i = 0; i < quantity; i++) {
                            try IERC721(nftContract).transferFrom(address(this), minter, i) {
                            } catch {
                            }
                        }
                        
                        try IERC721(nftContract).balanceOf(minter) returns (uint256 finalBalance) {
                            return finalBalance > beforeBalance;
                        } catch {
                            // If we can't verify, assume success
                            return true;
                        }
                    }
                } catch {
                    // Can't check contract balance, assume success based on call result
                }
            } catch {
                // If we can't verify, assume success based on the call success
            }
            return true;
        }
        
        return false;
    }
    
    function _executeMintTo(address nftContract, address recipient, uint256 quantity, uint256 value) private returns (bool) {
        // Get current balance of NFTs for the recipient before mint
        uint256 beforeBalance = 0;
        try IERC721(nftContract).balanceOf(recipient) returns (uint256 balance) {
            beforeBalance = balance;
        } catch {
            // If balanceOf fails, we can't track balance changes, so proceed with mint
        }
        
        // Execute the mint
        (bool success, ) = nftContract.call{value: value}(
            abi.encodeWithSelector(MINT_TO_SIG, recipient, quantity)
        );
        
        if (success) {
            // Verify that the NFT was received by the recipient
            try IERC721(nftContract).balanceOf(recipient) returns (uint256 afterBalance) {
                // If balance increased, mint was successful
                return afterBalance > beforeBalance;
            } catch {
                // If we can't verify, assume success based on the call success
                return true;
            }
        }
        
        return false;
    }
    
    function _executePublicMint(address nftContract, uint256 quantity, uint256 value, address minter) private returns (bool) {
        // Get current balance of NFTs for the minter before mint
        uint256 beforeBalance = 0;
        try IERC721(nftContract).balanceOf(minter) returns (uint256 balance) {
            beforeBalance = balance;
        } catch {
            // If balanceOf fails, we can't track balance changes, so proceed with mint
        }
        
        // Execute the mint
        (bool success, ) = nftContract.call{value: value}(
            abi.encodeWithSelector(PUBLIC_MINT_SIG, quantity)
        );
        
        if (success) {
            // Verify that the NFT was received by the minter
            try IERC721(nftContract).balanceOf(minter) returns (uint256 afterBalance) {
                // If balance increased, mint was successful
                if (afterBalance > beforeBalance) {
                    return true;
                }
                
                // If the balance didn't increase, try to check if this contract received the NFT instead
                try IERC721(nftContract).balanceOf(address(this)) returns (uint256 contractBalance) {
                    if (contractBalance > 0) {
                        // Transfer the NFT from this contract to the user
                        for (uint256 i = 0; i < quantity; i++) {
                            // Find a token owned by the contract and transfer it
                            try IERC721(nftContract).transferFrom(address(this), minter, i) {
                                // Transfer succeeded
                            } catch {
                                // Transfer failed, continue to try other token IDs
                            }
                        }
                        
                        // Recheck minter's balance after transfers
                        try IERC721(nftContract).balanceOf(minter) returns (uint256 finalBalance) {
                            return finalBalance > beforeBalance;
                        } catch {
                            // If we can't verify, assume success
                            return true;
                        }
                    }
                } catch {
                    // Can't check contract balance, assume success based on call result
                }
            } catch {
                // If we can't verify, assume success based on the call success
            }
            return true;
        }
        
        return false;
    }
    
    function _executeCustomMint(address nftContract, bytes4 mintSig, uint256 quantity, uint256 value, address minter) private returns (bool) {
        // Get current balance of NFTs for the minter before mint
        uint256 beforeBalance = 0;
        try IERC721(nftContract).balanceOf(minter) returns (uint256 balance) {
            beforeBalance = balance;
        } catch {
            // If balanceOf fails, we can't track balance changes, so proceed with mint
        }
        
        // Execute the mint
        (bool success, ) = nftContract.call{value: value}(
            abi.encodeWithSelector(mintSig, quantity)
        );
        
        if (success) {
            // Verify that the NFT was received by the minter
            try IERC721(nftContract).balanceOf(minter) returns (uint256 afterBalance) {
                // If balance increased, mint was successful
                if (afterBalance > beforeBalance) {
                    return true;
                }
                
                // If the balance didn't increase, try to check if this contract received the NFT instead
                try IERC721(nftContract).balanceOf(address(this)) returns (uint256 contractBalance) {
                    if (contractBalance > 0) {
                        // Transfer the NFT from this contract to the user
                        for (uint256 i = 0; i < quantity; i++) {
                            // Find a token owned by the contract and transfer it
                            try IERC721(nftContract).transferFrom(address(this), minter, i) {
                                // Transfer succeeded
                            } catch {
                                // Transfer failed, continue to try other token IDs
                            }
                        }
                        
                        // Recheck minter's balance after transfers
                        try IERC721(nftContract).balanceOf(minter) returns (uint256 finalBalance) {
                            return finalBalance > beforeBalance;
                        } catch {
                            // If we can't verify, assume success
                            return true;
                        }
                    }
                } catch {
                    // Can't check contract balance, assume success based on call result
                }
            } catch {
                // If we can't verify, assume success based on the call success
            }
            return true;
        }
        
        return false;
    }
    
    // Fallback and receive functions
    receive() external payable {
        userBalances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }
    
    fallback() external payable {
        userBalances[msg.sender] += msg.value;
        emit FundsDeposited(msg.sender, msg.value);
    }
} 