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
forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/NFTSniper.sol:NFTSniper
```

## License

MIT

# NFTSniper Contract Deployment

This document provides instructions for deploying the NFTSniper contract to Ethereum networks using Foundry.

## Prerequisites

1. [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
2. An Ethereum wallet with ETH for deployment gas (Metamask, etc.)
3. Access to an Ethereum node or RPC provider (Infura, Alchemy, etc.)

## Deployment Steps

### 1. Install Foundry

If you haven't installed Foundry yet, run:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Clone and Build

Clone the repository and build the contracts:

```bash
git clone <repository-url>
cd contract
forge build
```

### 3. Configure Environment Variables

Create a `.env` file in the contract directory:

```bash
# Private key of the wallet you want to deploy from (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URL of the Ethereum network you want to deploy to
RPC_URL=your_rpc_url_here
```

Then load the environment variables:

```bash
source .env
```

### 4. Deploy the Contract

Use Foundry's `forge create` command to deploy:

```bash
forge create --rpc-url $RPC_URL --private-key $PRIVATE_KEY src/NFTSniper.sol:NFTSniper
```

This will output the deployed contract address. Copy this address and update it in your frontend code:

1. Open `src/utils/contractIntegration.ts`
2. Find the line with `const NFT_SNIPER_ADDRESS = '...'`
3. Replace it with your newly deployed contract address

### 5. Verify the Contract (Optional)

If you're deploying to a network with Etherscan support, verify your contract:

```bash
forge verify-contract --chain-id <CHAIN_ID> --compiler-version <VERSION> <DEPLOYED_ADDRESS> src/NFTSniper.sol:NFTSniper <ETHERSCAN_API_KEY>
```

Replace:
- `<CHAIN_ID>` with the chain ID (e.g., 1 for Ethereum mainnet)
- `<VERSION>` with the compiler version (e.g., 0.8.19)
- `<DEPLOYED_ADDRESS>` with your contract's address
- `<ETHERSCAN_API_KEY>` with your Etherscan API key

## Deployment to Different Networks

### Ethereum Mainnet

```bash
forge create --rpc-url https://mainnet.infura.io/v3/your_infura_key --private-key $PRIVATE_KEY src/NFTSniper.sol:NFTSniper
```

### Sepolia Testnet

```bash
forge create --rpc-url https://sepolia.infura.io/v3/your_infura_key --private-key $PRIVATE_KEY src/NFTSniper.sol:NFTSniper
```

### Local Anvil Node

Start a local Anvil node in a separate terminal:

```bash
anvil
```

Then deploy to the local node:

```bash
forge create --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 src/NFTSniper.sol:NFTSniper
```

## Handling Upcoming NFT Collections

For NFT collections that are not yet deployed (like the SEEDS collection that launches on May 15th), our system:

1. Registers the contract address for monitoring
2. Once the contract is deployed, automatically detects it
3. Sets up the sniping configuration
4. Executes the mint transaction as soon as the collection goes live

The frontend will show appropriate information for upcoming drops, including the time remaining until launch.

## Troubleshooting

If you encounter the error "No contract deployed at this address", this is expected for NFTs that haven't launched yet, like the SEEDS collection. The system will handle this correctly by setting up monitoring instead of immediate minting.
