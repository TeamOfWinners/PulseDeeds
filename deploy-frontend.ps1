# PowerShell script to deploy the React app
Write-Host "Deploying PulseDeeds frontend..." -ForegroundColor Cyan

# Navigate to frontend directory
cd frontend

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Deploy to GitHub Pages
Write-Host "Deploying to GitHub Pages..." -ForegroundColor Yellow
npm run deploy

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "Your site will be available at: https://teamofwinners.github.io/PulseDeeds" -ForegroundColor Cyan 