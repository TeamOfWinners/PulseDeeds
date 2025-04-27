# PowerShell script to deploy contracts to PulseChain
# Check if .env file exists
if (!(Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your private key and RPC URL:" -ForegroundColor Yellow
    Write-Host "PRIVATE_KEY=your_private_key_here" -ForegroundColor Yellow
    Write-Host "RPC_URL=your_pulsechain_rpc_url_here" -ForegroundColor Yellow
    exit
}

# Deploy to PulseChain testnet
Write-Host "Deploying contracts to PulseChain testnet..." -ForegroundColor Cyan
npx hardhat run scripts/deploy.js --network pulseTestnet

Write-Host ""
Write-Host "After deployment:" -ForegroundColor Green
Write-Host "1. Copy the deployed contract address" -ForegroundColor Yellow
Write-Host "2. Update frontend/src/App.js with the contract address" -ForegroundColor Yellow
Write-Host "3. Then deploy the frontend" -ForegroundColor Yellow 