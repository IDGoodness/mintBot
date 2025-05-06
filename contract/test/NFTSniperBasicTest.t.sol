// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {NFTSniper} from "../src/NFTSniper.sol";

contract NFTSniperBasicTest is Test {
    NFTSniper public sniper;
    
    address public owner;
    address public user1;
    address public user2;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.deal(owner, 10 ether);
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        
        sniper = new NFTSniper();
    }
    
    function testDeposit() public {
        vm.startPrank(user1);
        
        sniper.deposit{value: 0.5 ether}();
        assertEq(sniper.userBalances(user1), 0.5 ether, "Deposit amount incorrect");
        
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
    
    function testSetTargetActive() public {
        vm.startPrank(user1);
        
        // Setup a dummy target
        bytes4 mintSig = bytes4(keccak256("mint(uint256)"));
        address dummyContract = address(0x1234567890123456789012345678901234567890);
        
        sniper.setupTarget(dummyContract, mintSig, 100 gwei, 0.1 ether);
        
        // Check initial status
        (, , , bool initialActive) = sniper.mintConfigurations(user1, dummyContract);
        assertTrue(initialActive, "Target should start active");
        
        // Deactivate the target
        sniper.setTargetActive(dummyContract, false);
        
        // Check updated status
        (, , , bool updatedActive) = sniper.mintConfigurations(user1, dummyContract);
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
    
    function test_RevertWhen_InsufficientFunds() public {
        vm.startPrank(user1);
        
        // Deposit a small amount
        sniper.deposit{value: 0.04 ether}();
        
        // Setup the target with a dummy contract
        address dummyContract = address(0x1234567890123456789012345678901234567890);
        sniper.setupTarget(dummyContract, bytes4(keccak256("mint(uint256)")), 100 gwei, 0.1 ether);
        
        // Try to execute a mint that costs more than available funds
        vm.expectRevert("Insufficient funds");
        sniper.executeMint(dummyContract, 1, 0.05 ether, 50 gwei);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_GasPriceTooHigh() public {
        vm.startPrank(user1);
        
        // Fund the contract
        sniper.deposit{value: 1 ether}();
        
        // Setup the target with low max gas price
        address dummyContract = address(0x1234567890123456789012345678901234567890);
        sniper.setupTarget(dummyContract, bytes4(keccak256("mint(uint256)")), 10 gwei, 0.1 ether);
        
        // Try to execute with high gas price
        vm.txGasPrice(20 gwei);
        
        // Expect a revert with the specific error message
        vm.expectRevert("Gas price too high");
        sniper.executeMint(dummyContract, 1, 0.05 ether, 20 gwei);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_MintPriceTooHigh() public {
        vm.startPrank(user1);
        
        // Fund the contract
        sniper.deposit{value: 1 ether}();
        
        // Setup the target with low max mint price
        address dummyContract = address(0x1234567890123456789012345678901234567890);
        sniper.setupTarget(dummyContract, bytes4(keccak256("mint(uint256)")), 100 gwei, 0.04 ether);
        
        // Try to execute with high mint price
        vm.expectRevert("Mint price too high");
        sniper.executeMint(dummyContract, 1, 0.05 ether, 50 gwei);
        
        vm.stopPrank();
    }
    
    receive() external payable {}
} 