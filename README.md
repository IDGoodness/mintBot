# mintBot - NFT Sniping System

MintBot is a decentralized NFT sniping system that enables users to automatically mint NFTs as soon as they launch. The system consists of smart contracts for on-chain sniping and a user-friendly frontend for configuration.

## Deployed Contracts (Local Anvil Network)

The system currently has the following deployed contracts on the local Anvil network:

- **NFTSniper Contract**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **NFTWatcher Contract**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- **Mock NFT Contract** (for testing): `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`

## System Architecture

The system consists of two main components:

1. **Smart Contracts**: Written in Solidity and deployed on Ethereum-compatible networks
   - `NFTSniper.sol`: Handles minting NFTs with auto-detection of mint functions, configurable gas prices, and user balance management
   - `NFTWatcher.sol`: Monitors NFT launches and triggers minting through NFTSniper

2. **Frontend**: A React application to manage sniping configuration and monitor status
   - Connects to deployed smart contracts using ethers.js
   - Allows users to deposit funds, configure gas settings, and target specific NFT contracts
   - Displays real-time status of the sniping system

## Quick Start

### Prerequisites

- Node.js v16+
- Metamask wallet extension installed in your browser
- Local Ethereum node (Anvil from Foundry) running

### Running the Local Blockchain

Start a local Ethereum node using Anvil (comes with Foundry):

```bash
cd contract
anvil
```

This will start a local blockchain with 10 pre-funded accounts for testing.

### Deploy the Contracts

Deploy the contracts to your local blockchain:

```bash
cd contract
forge script script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --broadcast
```

This will deploy the NFTSniper and NFTWatcher contracts.

For testing, you can also deploy a mock NFT contract:

```bash
forge script script/DeployMockNFT.s.sol:DeployMockNFTScript --rpc-url http://localhost:8545 --broadcast
```

### Start the Frontend

Start the frontend development server:

```bash
npm run dev
```

This will start the development server on http://localhost:5173 (or another port if 5173 is in use).

## How to Use mintBot

1. **Connect Your Wallet**: 
   - Connect your Metamask wallet to the application
   - Ensure you're connected to the correct network (localhost:8545 for testing)

2. **Deposit Funds**:
   - Navigate to the Funding section
   - Deposit ETH to cover your minting costs
   - The funds are stored in the NFTSniper contract and can be withdrawn at any time

3. **Configure Sniping**:
   - Enter the NFT contract address you want to snipe
   - Fetch the NFT details to verify it's a valid contract
   - Set your gas price percentage (higher percentages increase chances of successful minting)

4. **Activate the Bot**:
   - Click "Activate Bot" to start monitoring the NFT contract
   - The system will watch for mint events and automatically attempt to mint when detected

5. **Monitor Status**:
   - The NFT Sniper Status panel will show you the current status
   - You'll be notified when a mint is attempted and if it's successful

## Testing with the Mock NFT

To test the system with our deployed mock NFT:

1. Enter the Mock NFT contract address in the dashboard: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`
2. Deposit at least 0.1 ETH to the sniper contract
3. Configure gas settings (recommended 100-150% for testing)
4. Activate the bot
5. To simulate a mint event, you can:
   - Manually mint from the contract: `forge script script/MintFromMock.s.sol:MintScript --rpc-url http://localhost:8545 --broadcast`
   - Or create a simple script to trigger the contract

## Development

### Frontend Development

The frontend is built with React, Vite, and ethers.js. The main components are:

- `DashboardPanel.tsx`: The main interface for the application
- `NFTSniperStatus.tsx`: Displays real-time status of the sniping system
- `NFTSniperFunding.tsx`: Manages deposits and withdrawals
- `useNFTMintWatcher.ts`: React hook for interacting with the contracts

### Smart Contract Development

The smart contracts are written in Solidity and use Foundry for development. The main contracts are:

- `NFTSniper.sol`: Handles the actual minting logic
- `NFTWatcher.sol`: Monitors NFT contracts for launch events

To run tests:

```bash
cd contract
forge test
```

## Future Enhancements

- Support for multiple NFT standards (ERC1155, etc.)
- Multi-chain support
- Enhanced minting strategies
- Integration with NFT marketplaces for real-time floor price data
- Gasless minting options

## Security Notes

- Always verify contract addresses before interacting with them
- Never deposit more funds than you are willing to lose
- Be aware that minting is not guaranteed and depends on network conditions
- For production use, additional security audits would be required

## License

MIT