// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../test/mocks/SimpleMockNFT.sol";

contract DeployMockNFTScript is Script {
    function run() public {
        // Use the default first Anvil account
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy mock NFT
        SimpleMockNFT mockNFT = new SimpleMockNFT("TestNFT", "TNFT");
        console.log("Mock NFT deployed at:", address(mockNFT));
        
        // Enable minting and set a price
        mockNFT.setMintPrice(50000000000000000); // 0.05 ETH
        mockNFT.toggleMinting(true);
        console.log("Minting enabled at price: 0.05 ETH");
        
        vm.stopBroadcast();
    }
} 