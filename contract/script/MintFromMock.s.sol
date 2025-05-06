// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../test/mocks/SimpleMockNFT.sol";

contract MintScript is Script {
    function run() public {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        
        address mockNFTAddress = 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9;
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleMockNFT mockNFT = SimpleMockNFT(mockNFTAddress);
        
        mockNFT.toggleMinting(true);
        
        mockNFT.setMintPrice(50000000000000000);
        
        mockNFT.mint{value: 50000000000000000}(1); 
        console.log("Minted NFT #1");
        
        vm.warp(block.timestamp + 15);
        
        mockNFT.mint{value: 50000000000000000}(1); 
        console.log("Minted NFT #2");
        
        vm.warp(block.timestamp + 30);
        
        mockNFT.mint{value: 50000000000000000}(1); 
        console.log("Minted NFT #3");
        
        console.log("Mock NFT now has increased activity - this should trigger the sniping bot");
        
        vm.stopBroadcast();
    }
} 