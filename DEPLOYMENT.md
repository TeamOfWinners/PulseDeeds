# PulseDeeds Deployment Guide

This guide will help you deploy the PulseDeeds DApp to various platforms. The application consists of two parts:
1. Smart contracts (deployed on PulseChain)
2. Frontend React application

## Smart Contract Deployment

Your contracts should be deployed to PulseChain. The project is already configured in `hardhat.config.js` for this.

### Prerequisites
1. Make sure you have a `.env` file with your private key and RPC URL:
```
PRIVATE_KEY=your_private_key_here
RPC_URL=your_pulsechain_rpc_url_here
```

2. Deploy the contract to PulseChain testnet:
```
npm run deploy:testnet
```

3. Once deployed, update the contract address in `frontend/src/App.js`:
```javascript
const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

## Frontend Deployment Options

### Option 1: GitHub Pages (Easiest)

1. If you have a GitHub repository for your project, update the `homepage` field in `frontend/package.json`:
```json
"homepage": "https://yourusername.github.io/pulsedeeds",
```

2. Deploy using the built-in script:
```
cd frontend
npm run deploy
```

This will publish your site to GitHub Pages at the URL specified in the homepage field.

### Option 2: Vercel

1. Push your code to a GitHub repository
2. Go to [Vercel](https://vercel.com/new)
3. Import your GitHub repository
4. Configure the build settings:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
5. Deploy

### Option 3: Netlify

1. Push your code to a GitHub repository
2. Go to [Netlify](https://app.netlify.com/start)
3. Connect to your GitHub account and select the repository
4. Configure the build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
5. Deploy

### Option 4: AWS Amplify

1. Create an AWS account if you don't have one
2. Go to AWS Amplify Console
3. Choose "Deploy without Git provider" option
4. Build the frontend: `cd frontend && npm run build`
5. Zip the build folder: `cd build && zip -r ../build.zip *`
6. Upload the zip file to AWS Amplify

## Environment Variables

For production deployments, you might need to set the following environment variables:

- `REACT_APP_CHAIN_ID`: The PulseChain ID (e.g., 369 for mainnet, 943 for testnet)
- `REACT_APP_NODE_URL`: Your RPC provider URL (optional if using MetaMask)

## Post-Deployment Checks

After deploying:

1. Verify your site loads correctly
2. Test connecting with MetaMask
3. Test minting and transferring deeds
4. Check for any console errors

## Troubleshooting

- If you see CORS errors, verify your RPC endpoint supports the origin of your deployed frontend
- If MetaMask connection fails, check that you're on PulseChain network
- If transactions fail, ensure your contract is deployed to the correct network

## IPFS Deployment (Optional)

For a truly decentralized frontend:

1. Install IPFS Desktop
2. Build your React app: `cd frontend && npm run build`
3. Add the build folder to IPFS
4. Pin the folder to ensure it stays available
5. Access your DApp via an IPFS gateway like `https://ipfs.io/ipfs/YOUR_HASH`

## Fleek Deployment (IPFS + ENS)

For the most decentralized deployment:

1. Create a [Fleek](https://fleek.co/) account
2. Connect your GitHub repository
3. Configure the build settings similar to Netlify
4. Optionally connect an ENS domain for a human-readable URL 