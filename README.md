# PulseDeeds - Decentralized Property Deed Registry

PulseDeeds is a decentralized application (dApp) built on the PulseChain network that allows users to tokenize property deeds as NFTs, securely storing and transferring them on the blockchain.

## Features

- **Mint Property Deeds**: Convert your property deeds into NFTs with customizable metadata
- **Track Property Values**: Store and update property values on-chain
- **Transfer Ownership**: Securely transfer deed ownership to other wallet addresses
- **Fee System**: Transparent fee structure based on property value (0.3% or minimum fee)
- **Responsive UI**: Modern interface that works across devices

## Tech Stack

- **Blockchain**: PulseChain (Compatible with PulseChain Mainnet and Testnet)
- **Smart Contracts**: Solidity 0.8.20
- **Frontend**: React.js with ethers.js
- **Web3 Integration**: MetaMask wallet connection

## Contract Address

The main contract is deployed at: `0xC1BBb9401bA72E6E23cE5d03C92F7DEEe6595F9D`

## Getting Started

### Prerequisites

- Node.js and npm
- MetaMask wallet

### Local Development

1. Clone the repository:
```
git clone https://github.com/TeamOfWinners/PulseDeeds.git
cd PulseDeeds
```

2. Install dependencies:
```
# Install project dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

3. Start the development server:
```
# From the frontend directory
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Deployment

See the [DEPLOYMENT.md](DEPLOYMENT.md) file for detailed instructions on deploying both the smart contracts and the frontend to various platforms.

Quick deployment options:

```bash
# Deploy contracts to PulseChain testnet
npm run deploy:testnet

# Build the frontend for production
npm run build-frontend

# Deploy frontend to GitHub Pages
npm run deploy-frontend
```

## Usage

1. **Connect Wallet**: Click the "Connect Wallet" button to connect your MetaMask wallet
2. **Mint a Deed**: Fill out the form with recipient address, metadata URI, and optional property value
3. **View Your Deeds**: Your minted deeds will appear in the "My Deeds" section
4. **Transfer Deeds**: Use the transfer form to send deeds to another wallet address

## Smart Contract

The `PulseDeedNFT` contract extends ERC721 and includes the following key features:

- Minting NFTs representing property deeds
- Storing property values
- Calculating fees based on property value
- Transferring deeds with value updates
- Owner functions for fee management

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Hackathon Submission

This project was developed for the [Hackathon Name] on Devpost.

## Team

- [Team Member 1]
- [Team Member 2]
- [Team Member 3]

## Acknowledgements

- [PulseChain](https://pulsechain.com)
- [OpenZeppelin](https://openzeppelin.com) for secure contract libraries
