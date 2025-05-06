// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/NFTSniper.sol";
import "../src/NFTWatcher.sol";

contract DeployScript is Script {
    function run() public {
        // Use the default first Anvil account
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy NFTSniper first
        NFTSniper nftSniper = new NFTSniper();
        console.log("NFTSniper deployed at:", address(nftSniper));
        
        // Deploy NFTWatcher and pass in the NFTSniper address
        NFTWatcher nftWatcher = new NFTWatcher(address(nftSniper));
        console.log("NFTWatcher deployed at:", address(nftWatcher));
        
        vm.stopBroadcast();
    }
} 