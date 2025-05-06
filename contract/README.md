# NFT Sniping Smart Contracts

This repository contains smart contracts for high-speed NFT minting, designed to help users snipe NFTs as soon as they launch.

## Overview

The system consists of two main contracts:

1. **NFTSniper.sol** - Responsible for executing minting transactions with optimized gas settings
2. **NFTWatcher.sol** - Monitors NFT launches and triggers the NFTSniper to execute mints

## Features

- ✅ **Auto-detection** of mint function signatures
- ✅ **Configurable gas prices** for competitive minting
- ✅ **Multiple mint methods** support for various NFT contract implementations
- ✅ **User balances** for depositing ETH to be used for minting
- ✅ **Launch monitoring** to detect when NFTs become available
- ✅ **Gas optimization** to ensure successful minting in competitive situations

## Contract Architecture

### NFTSniper

The NFTSniper contract serves as the execution layer that interacts directly with NFT contracts to mint NFTs. Key functions:

- `setupTarget(address nftContract, bytes4 mintSig, uint256 maxGasPrice, uint256 maxMintPrice)`: Configure a target NFT contract
- `deposit()`: Deposit ETH to be used for minting
- `withdraw(uint256 amount)`: Withdraw ETH from the contract
- `executeMint(address nftContract, uint256 quantity, uint256 mintPrice, uint256 gasPrice)`: Execute a mint transaction
- `setTargetActive(address nftContract, bool active)`: Activate or deactivate a target

### NFTWatcher

The NFTWatcher contract monitors NFT launches and coordinates with the NFTSniper contract. Key functions:

- `setupWatcher(address nftContract, uint256 quantity, uint256 maxPrice, uint256 gasMultiplier, bool autoMint)`: Configure watching for an NFT
- `markAsLaunched(address nftContract, uint256 price)`: Mark an NFT as launched (owner only)
- `triggerMint(address nftContract)`: Manually trigger minting for a launched NFT
- `stopWatching(address nftContract)`: Stop watching an NFT

## How to Use

### Setup

1. Deploy the NFTSniper contract
2. Deploy the NFTWatcher contract, passing the NFTSniper address
3. Deposit ETH to the NFTSniper contract to fund minting operations

### Configuring a Target NFT

```solidity
// Configure the NFTSniper
nftSniper.setupTarget(
    nftContractAddress,  // Address of the NFT contract
    0x00000000,          // Use 0 for auto-detection of mint function
    30 gwei,             // Maximum gas price willing to pay
    0.1 ether            // Maximum price per NFT
);

// Configure the NFTWatcher
nftWatcher.setupWatcher(
    nftContractAddress,  // Address of the NFT contract
    1,                   // Number of NFTs to mint
    0.1 ether,           // Maximum price per NFT
    15000,               // Gas multiplier (150% of base fee)
    true                 // Auto-mint when launch detected
);
```

### Minting an NFT

The minting can happen in two ways:

1. **Auto-minting**: If the NFT is marked as launched by the owner and `autoMint` was set to true
2. **Manual trigger**: By calling `nftWatcher.triggerMint(nftContractAddress)`

## Development and Testing

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Setup

```bash
git clone <repository-url>
cd nft-sniping-contracts
forge install
```

### Compile Contracts

```bash
forge build
```

### Run Tests

```bash
forge test
```

### Deploy

```bash
source .env
forge script script/DeployNFTSniping.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Integration with Frontend

The frontend can interact with these contracts using ethers.js. See the `useNFTMintWatcher.ts` hook for an example integration.

## License

MIT
