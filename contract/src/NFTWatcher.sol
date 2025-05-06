// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface to the NFTSniper contract
interface INFTSniper {
    function executeMint(
        address nftContract,
        uint256 quantity,
        uint256 mintPrice,
        uint256 gasPrice
    ) external;
}

/**
 * @title NFTWatcher
 * @dev A contract that monitors NFT launches and can trigger minting through the NFTSniper
 */
contract NFTWatcher is Ownable, ReentrancyGuard {
    // Events
    event WatcherSetup(address indexed user, address indexed nftContract);
    event LaunchDetected(address indexed nftContract, uint256 timestamp);
    event AutoMintTriggered(address indexed user, address indexed nftContract);
    
    // Struct to store user configurations for a target NFT
    struct WatchConfig {
        bool isWatching;         // Whether this user is watching this NFT
        uint256 quantity;        // Number of NFTs to mint
        uint256 maxPrice;        // Maximum price willing to pay per NFT
        uint256 gasMultiplier;   // Multiplier for gas price (in basis points, e.g. 12000 = 120%)
        bool autoMint;           // Whether to automatically mint when detected
    }
    
    // Struct to store global information about a watched NFT
    struct LaunchInfo {
        bool hasLaunched;        // Whether this NFT has been detected as launched
        uint256 launchTimestamp; // When the NFT was detected as launched
        uint256 detectedPrice;   // The detected mint price
        uint256 mintCount;       // Number of users who have auto-minted
    }
    
    // Mapping of NFT contract to launch info
    mapping(address => LaunchInfo) public launchInfo;
    
    // Mapping of user address => NFT contract address => watch configuration
    mapping(address => mapping(address => WatchConfig)) public watchConfigurations;
    
    // Mapping to track which users have auto-minted for a specific NFT
    mapping(address => mapping(address => bool)) private hasAutoMinted;
    
    // Addresses that are watching an NFT (for iteration)
    mapping(address => address[]) private watchersForNFT;
    
    // Address of the NFTSniper contract
    address public nftSniperContract;
    
    // Constructor
    constructor(address _nftSniperContract) Ownable(msg.sender) {
        require(_nftSniperContract != address(0), "Invalid NFTSniper address");
        nftSniperContract = _nftSniperContract;
    }
    
    /**
     * @dev Set up watching for an NFT contract
     * @param nftContract The NFT contract address to watch
     * @param quantity Number of NFTs to mint
     * @param maxPrice Maximum price per NFT in wei
     * @param gasMultiplier Gas price multiplier in basis points (10000 = 100%)
     * @param autoMint Whether to automatically mint when launch is detected
     */
    function setupWatcher(
        address nftContract,
        uint256 quantity,
        uint256 maxPrice,
        uint256 gasMultiplier,
        bool autoMint
    ) external {
        require(nftContract != address(0), "Invalid NFT contract");
        require(quantity > 0, "Quantity must be greater than 0");
        require(gasMultiplier >= 10000, "Gas multiplier must be at least 100%");
        
        // Add user to watchers list if not already watching
        if (!watchConfigurations[msg.sender][nftContract].isWatching) {
            watchersForNFT[nftContract].push(msg.sender);
        }
        
        watchConfigurations[msg.sender][nftContract] = WatchConfig({
            isWatching: true,
            quantity: quantity,
            maxPrice: maxPrice,
            gasMultiplier: gasMultiplier,
            autoMint: autoMint
        });
        
        emit WatcherSetup(msg.sender, nftContract);
    }
    
    /**
     * @dev Mark an NFT as launched (only callable by owner or authorized addresses)
     * @param nftContract The NFT contract that has launched
     * @param price The detected mint price
     */
    function markAsLaunched(address nftContract, uint256 price) external onlyOwner {
        require(nftContract != address(0), "Invalid NFT contract");
        require(!launchInfo[nftContract].hasLaunched, "Already marked as launched");
        
        launchInfo[nftContract] = LaunchInfo({
            hasLaunched: true,
            launchTimestamp: block.timestamp,
            detectedPrice: price,
            mintCount: 0
        });
        
        emit LaunchDetected(nftContract, block.timestamp);
        
        // Process auto-mints in a separate function to avoid gas limit issues
        _processAutoMints(nftContract, price);
    }
    
    /**
     * @dev Process auto-mints for users who have set autoMint to true
     * @param nftContract The NFT contract that has launched
     * @param price The detected mint price
     */
    function _processAutoMints(address nftContract, uint256 price) internal {
        // Get the list of watchers for this NFT
        address[] memory watchers = watchersForNFT[nftContract];
        
        // Loop through the watchers and trigger auto-mints for those who have enabled it
        // We limit processing to avoid gas limit issues (could be batched in production)
        uint256 processLimit = watchers.length > 10 ? 10 : watchers.length;
        
        for (uint256 i = 0; i < processLimit; i++) {
            address user = watchers[i];
            WatchConfig memory config = watchConfigurations[user][nftContract];
            
            // Check if the user is watching, has auto-mint enabled, and hasn't minted yet
            if (config.isWatching && 
                config.autoMint && 
                !hasAutoMinted[user][nftContract] &&
                price <= config.maxPrice) {
                
                // Calculate gas price with the user's multiplier
                uint256 gasPrice = block.basefee * config.gasMultiplier / 10000;
                
                // Mark as auto-minted to prevent duplicate attempts
                hasAutoMinted[user][nftContract] = true;
                
                // Try to trigger the mint through the NFTSniper contract
                try INFTSniper(nftSniperContract).executeMint(
                    nftContract,
                    config.quantity,
                    price,
                    gasPrice
                ) {
                    // Increment successful mint count
                    launchInfo[nftContract].mintCount += 1;
                    emit AutoMintTriggered(user, nftContract);
                } catch {
                    // If the mint fails, reset the auto-minted flag so they can try again
                    hasAutoMinted[user][nftContract] = false;
                }
            }
        }
        
        // If there are more watchers than we could process, they'll need to trigger manually
    }
    
    /**
     * @dev Trigger a mint through the NFTSniper contract
     * @param nftContract The NFT contract to mint from
     */
    function triggerMint(address nftContract) external nonReentrant {
        require(launchInfo[nftContract].hasLaunched, "NFT not launched yet");
        
        WatchConfig memory config = watchConfigurations[msg.sender][nftContract];
        require(config.isWatching, "Not watching this NFT");
        
        uint256 price = launchInfo[nftContract].detectedPrice;
        require(price <= config.maxPrice, "Price exceeds maximum");
        
        // Get current gas price and apply multiplier
        uint256 gasPrice = block.basefee * config.gasMultiplier / 10000;
        
        // Call the NFTSniper contract to execute the mint
        INFTSniper(nftSniperContract).executeMint(
            nftContract,
            config.quantity,
            price,
            gasPrice
        );
        
        // Update mint count
        launchInfo[nftContract].mintCount += 1;
        
        emit AutoMintTriggered(msg.sender, nftContract);
    }
    
    /**
     * @dev Update the NFTSniper contract address
     * @param _newAddress The new NFTSniper contract address
     */
    function updateNFTSniperAddress(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Invalid address");
        nftSniperContract = _newAddress;
    }
    
    /**
     * @dev Stop watching an NFT contract
     * @param nftContract The NFT contract to stop watching
     */
    function stopWatching(address nftContract) external {
        require(watchConfigurations[msg.sender][nftContract].isWatching, "Not watching this NFT");
        watchConfigurations[msg.sender][nftContract].isWatching = false;
    }
} 