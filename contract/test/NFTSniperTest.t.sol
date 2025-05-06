// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {NFTSniper} from "../src/NFTSniper.sol";
import {SimpleMockNFT} from "./mocks/SimpleMockNFT.sol";

contract NFTSniperTest is Test {
    NFTSniper public sniper;
    SimpleMockNFT public mockNFT;
    
    address public owner;
    address public user1;
    address public user2;
    
    function setUp() public {
        // Create test users with ETH
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        // Fund the test users
        vm.deal(owner, 10 ether);
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        
        // Deploy the NFTSniper contract
        sniper = new NFTSniper();
        
        // Deploy a mock NFT for testing
        mockNFT = new SimpleMockNFT("MockNFT", "MNFT");
        mockNFT.setMintPrice(0.05 ether);
        mockNFT.toggleMinting(true);
    }
    
    function testSetupTarget() public {
        // User1 sets up a target
        vm.startPrank(user1);
        
        // Fund the contract
        sniper.deposit{value: 1 ether}();
        
        // Setup the target
        bytes4 mintSig = bytes4(keccak256("mint(uint256)"));
        uint256 maxGasPrice = 100 gwei;
        uint256 maxMintPrice = 0.1 ether;
        
        sniper.setupTarget(address(mockNFT), mintSig, maxGasPrice, maxMintPrice);
        
        // Verify the setup
        (bytes4 configMintSig, uint256 configMaxGasPrice, uint256 configMaxMintPrice, bool active) = 
            sniper.mintConfigurations(user1, address(mockNFT));
            
        assertEq(configMintSig, mintSig, "Mint signature not set correctly");
        assertEq(configMaxGasPrice, maxGasPrice, "Max gas price not set correctly");
        assertEq(configMaxMintPrice, maxMintPrice, "Max mint price not set correctly");
        assertTrue(active, "Target not active");
        
        vm.stopPrank();
    }
    
    function testAutoDetectMintSignature() public {
        vm.startPrank(user1);
        
        // Fund the contract
        sniper.deposit{value: 1 ether}();
        
        // Verify the function exists by calling it directly
        mockNFT.mint{value: 0.05 ether}(1);
        assertEq(mockNFT.balanceOf(user1), 1, "Direct mint should work");
        
        // Setup the target with auto-detection (0 signature)
        uint256 maxGasPrice = 100 gwei;
        uint256 maxMintPrice = 0.1 ether;
        
        // Use explicit try-catch for better error reporting
        try sniper.setupTarget(address(mockNFT), bytes4(0), maxGasPrice, maxMintPrice) {
            // Verify the auto-detection
            (bytes4 configMintSig, , , ) = sniper.mintConfigurations(user1, address(mockNFT));
            bytes4 expectedMintSig = bytes4(keccak256("mint(uint256)"));
            
            assertEq(configMintSig, expectedMintSig, "Auto-detected mint signature incorrect");
        } catch Error(string memory reason) {
            // Use console2.log instead of fail with argument
            console2.log("Auto-detection failed:", reason);
            assertTrue(false, "Auto-detection failed");
        }
        
        vm.stopPrank();
    }
    
    function testDeposit() public {
        vm.startPrank(user1);
        
        // Initial deposit
        sniper.deposit{value: 0.5 ether}();
        assertEq(sniper.userBalances(user1), 0.5 ether, "Deposit amount incorrect");
        
        // Additional deposit
        sniper.deposit{value: 0.5 ether}();
        assertEq(sniper.userBalances(user1), 1 ether, "Deposit amount incorrect after second deposit");
        
        vm.stopPrank();
    }
    
    function testWithdraw() public {
        vm.startPrank(user1);
        
        // Deposit
        sniper.deposit{value: 1 ether}();
        
        // Check initial balance
        uint256 initialBalance = user1.balance;
        
        // Withdraw half
        sniper.withdraw(0.5 ether);
        
        // Check updated contract balance
        assertEq(sniper.userBalances(user1), 0.5 ether, "Remaining balance incorrect");
        
        // Check updated user ETH balance (should have increased by withdraw amount minus gas)
        assertTrue(user1.balance > initialBalance, "User balance not increased after withdrawal");
        
        vm.stopPrank();
    }
    
    function testExecuteMint() public {
        // Ensure NFT is ready for minting
        mockNFT.setMintPrice(0.05 ether);
        mockNFT.toggleMinting(true);
        
        // Fund the contract and setup target as user1
        vm.startPrank(user1);
        sniper.deposit{value: 1 ether}();
        
        // Setup the target with explicit signature
        bytes4 mintSig = bytes4(keccak256("mint(uint256)"));
        uint256 maxGasPrice = 100 gwei;
        uint256 maxMintPrice = 0.1 ether;
        sniper.setupTarget(address(mockNFT), mintSig, maxGasPrice, maxMintPrice);
        
        // Set gas price below max
        vm.txGasPrice(50 gwei);
        
        // Execute mint through sniper contract
        uint256 preMintBalance = sniper.userBalances(user1);
        sniper.executeMint(address(mockNFT), 1, 0.05 ether, 50 gwei);
        
        // Verify NFT was minted to user
        uint256 nftBalance = mockNFT.balanceOf(user1);
        assertEq(nftBalance, 1, "User did not receive NFT");
        
        // Verify ETH was deducted
        uint256 postMintBalance = sniper.userBalances(user1);
        assertEq(postMintBalance, preMintBalance - 0.05 ether, "Contract balance not reduced correctly");
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_GasPriceTooHigh() public {
        vm.startPrank(user1);
        
        // Fund the contract
        sniper.deposit{value: 1 ether}();
        
        // Setup the target with low max gas price
        sniper.setupTarget(address(mockNFT), bytes4(keccak256("mint(uint256)")), 10 gwei, 0.1 ether);
        
        // Try to execute with high gas price
        vm.txGasPrice(20 gwei);
        
        // Expect a revert with the specific error message
        vm.expectRevert("Gas price too high");
        sniper.executeMint(address(mockNFT), 1, 0.05 ether, 20 gwei);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_MintPriceTooHigh() public {
        vm.startPrank(user1);
        
        // Fund the contract
        sniper.deposit{value: 1 ether}();
        
        // Setup the target with low max mint price
        sniper.setupTarget(address(mockNFT), bytes4(keccak256("mint(uint256)")), 100 gwei, 0.04 ether);
        
        // Try to execute with high mint price
        vm.expectRevert("Mint price too high");
        sniper.executeMint(address(mockNFT), 1, 0.05 ether, 50 gwei);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_InsufficientFunds() public {
        vm.startPrank(user1);
        
        // Deposit a small amount
        sniper.deposit{value: 0.04 ether}();
        
        // Setup the target
        sniper.setupTarget(address(mockNFT), bytes4(keccak256("mint(uint256)")), 100 gwei, 0.1 ether);
        
        // Try to execute a mint that costs more than available funds
        vm.expectRevert("Insufficient funds");
        sniper.executeMint(address(mockNFT), 1, 0.05 ether, 50 gwei);
        
        vm.stopPrank();
    }
    
    function testSetTargetActive() public {
        vm.startPrank(user1);
        
        // Setup the target
        sniper.setupTarget(address(mockNFT), bytes4(keccak256("mint(uint256)")), 100 gwei, 0.1 ether);
        
        // Check initial status
        (, , , bool initialActive) = sniper.mintConfigurations(user1, address(mockNFT));
        assertTrue(initialActive, "Target should start active");
        
        // Deactivate the target
        sniper.setTargetActive(address(mockNFT), false);
        
        // Check updated status
        (, , , bool updatedActive) = sniper.mintConfigurations(user1, address(mockNFT));
        assertFalse(updatedActive, "Target should be inactive");
        
        vm.stopPrank();
    }
    
    function testFallbackDeposit() public {
        // Send ETH directly to the contract
        (bool success, ) = address(sniper).call{value: 0.5 ether}("");
        assertTrue(success, "Direct ETH transfer failed");
        
        // Check that it was credited to the sender
        assertEq(sniper.userBalances(address(this)), 0.5 ether, "Fallback deposit not credited");
    }
    
    receive() external payable {}
} 