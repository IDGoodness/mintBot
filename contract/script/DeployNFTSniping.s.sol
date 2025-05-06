// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import {NFTSniper} from "../src/NFTSniper.sol";
import {NFTWatcher} from "../src/NFTWatcher.sol";

/**
 * @title DeployNFTSniping
 * @dev Script to deploy the NFT sniping contracts
 * 
 * NOTE: When testing with OpenZeppelin dependencies, you may encounter import errors.
 * To resolve these issues:
 * 1. Ensure you have the correct remappings in foundry.toml
 * 2. Run `forge install OpenZeppelin/openzeppelin-contracts --no-commit`
 * 3. If issues persist, use `forge test --match-contract "NFTSniperBasicTest"` 
 *    to run tests that don't rely on external dependencies
 */
contract DeployNFTSniping is Script {
    function run() public {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the NFTSniper contract
        NFTSniper nftSniper = new NFTSniper();
        
        // Deploy the NFTWatcher contract, passing in the NFTSniper address
        NFTWatcher nftWatcher = new NFTWatcher(address(nftSniper));
        
        // Log the addresses
        console.log("NFTSniper deployed at:", address(nftSniper));
        console.log("NFTWatcher deployed at:", address(nftWatcher));
        
        // Stop broadcasting transactions
        vm.stopBroadcast();
    }
}

/**
 * @title InitializeNFTSniping
 * @dev Script to initialize the NFT sniping contracts with test data
 */
contract InitializeNFTSniping is Script {
    function run(address payable nftSniperAddress, address nftWatcherAddress) public {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Get contract instances
        NFTSniper nftSniper = NFTSniper(nftSniperAddress);
        NFTWatcher nftWatcher = NFTWatcher(nftWatcherAddress);
        
        // Example initialization:
        // Add initial funding to the NFTSniper contract
        payable(nftSniperAddress).transfer(1 ether);
        
        // Setup a test target with auto-detection of mint function
        // Arguments: nftContract, mintSig (0 for auto-detect), maxGasPrice, maxMintPrice
        nftSniper.setupTarget(
            address(0x1234567890123456789012345678901234567890), // Example NFT address
            bytes4(0), // Auto-detect mint function
            50 gwei,   // Max gas price
            0.1 ether  // Max mint price per NFT
        );
        
        // Setup a watcher for the test target
        // Arguments: nftContract, quantity, maxPrice, gasMultiplier, autoMint
        nftWatcher.setupWatcher(
            address(0x1234567890123456789012345678901234567890), // Example NFT address
            1,          // Quantity
            0.1 ether,  // Max price
            15000,      // Gas multiplier (150%)
            true        // Auto-mint enabled
        );
        
        console.log("Initialized NFTSniper and NFTWatcher with test configuration");
        
        // Stop broadcasting transactions
        vm.stopBroadcast();
    }
}

/**
 * @title DeployAndInitializeNFTSniping
 * @dev Script to deploy and initialize the NFT sniping contracts in one step
 */
contract DeployAndInitializeNFTSniping is Script {
    function run() public {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the NFTSniper contract
        NFTSniper nftSniper = new NFTSniper();
        
        // Deploy the NFTWatcher contract, passing in the NFTSniper address
        NFTWatcher nftWatcher = new NFTWatcher(address(nftSniper));
        
        // Log the addresses
        console.log("NFTSniper deployed at:", address(nftSniper));
        console.log("NFTWatcher deployed at:", address(nftWatcher));
        
        // Initialize with test funding
        payable(address(nftSniper)).transfer(1 ether);
        
        // Setup a test target with auto-detection of mint function
        // Arguments: nftContract, mintSig (0 for auto-detect), maxGasPrice, maxMintPrice
        nftSniper.setupTarget(
            address(0x1234567890123456789012345678901234567890), // Example NFT address
            bytes4(0), // Auto-detect mint function
            50 gwei,   // Max gas price
            0.1 ether  // Max mint price per NFT
        );
        
        // Setup a watcher for the test target
        // Arguments: nftContract, quantity, maxPrice, gasMultiplier, autoMint
        nftWatcher.setupWatcher(
            address(0x1234567890123456789012345678901234567890), // Example NFT address
            1,          // Quantity
            0.1 ether,  // Max price
            15000,      // Gas multiplier (150%)
            true        // Auto-mint enabled
        );
        
        console.log("Deployed and initialized NFT sniping contracts");
        
        // Stop broadcasting transactions
        vm.stopBroadcast();
    }
} 