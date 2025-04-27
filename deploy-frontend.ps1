# PowerShell script to build the React app for production deployment
cd frontend
npm run build
Write-Host "Build completed! The 'frontend/build' directory is ready for deployment." -ForegroundColor Green
Write-Host ""
Write-Host "Deployment options:" -ForegroundColor Cyan
Write-Host "1. Vercel: https://vercel.com/new - Import your GitHub repository" -ForegroundColor Yellow
Write-Host "2. Netlify: https://app.netlify.com/start - Connect to GitHub and select repository" -ForegroundColor Yellow
Write-Host "3. GitHub Pages: Add 'gh-pages' package and deploy script" -ForegroundColor Yellow
Write-Host "4. AWS Amplify: Connect through AWS Amplify Console" -ForegroundColor Yellow
Write-Host ""
Write-Host "For any of these options, point to the 'build' folder for deployment" -ForegroundColor Cyan 