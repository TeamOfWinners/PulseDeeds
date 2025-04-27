const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying PulseDeedNFT contract with fee structure...");

  // Get the ContractFactory for PulseDeedNFT
  const PulseDeedNFT = await ethers.getContractFactory("PulseDeedNFT");
  
  // Get the network information
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Deploy the contract
  const pulseDeedNFT = await PulseDeedNFT.deploy();
  
  console.log("Deployment transaction sent. Waiting for confirmation...");
  
  // Wait for deployment to finish
  await pulseDeedNFT.waitForDeployment();
  
  // Get the deployed contract address
  const deployedAddress = await pulseDeedNFT.getAddress();
  
  console.log("-----------------------------------------------");
  console.log(`PulseDeedNFT deployed successfully!`);
  console.log(`Contract address: ${deployedAddress}`);
  console.log("-----------------------------------------------");
  console.log("Fee Structure:");
  console.log("- 0.3% fee on all property transactions");
  console.log("- Minimum base fee: 0.01 PLS for minting");
  console.log("- Minimum base fee: 0.005 PLS for transfers");
  console.log("-----------------------------------------------");
  console.log("Important: Update the frontend/src/App.js with the new contract address");
  console.log("const contractAddress = \"" + deployedAddress + "\";");
  console.log("-----------------------------------------------");
  
  // Verify contract fees are set correctly
  const mintBaseFee = await pulseDeedNFT.mintBaseFee();
  console.log(`Base mint fee set to: ${ethers.formatEther(mintBaseFee)} PLS`);
  
  // Example fee calculations
  const propertyValue = ethers.parseEther("1000"); // 1000 PLS example property
  const mintFee = await pulseDeedNFT.calculateMintFee(propertyValue);
  const transferFee = await pulseDeedNFT.calculateTransferFee(propertyValue);
  
  console.log(`Example property valued at 1000 PLS:`);
  console.log(`- Mint fee: ${ethers.formatEther(mintFee)} PLS`);
  console.log(`- Transfer fee: ${ethers.formatEther(transferFee)} PLS`);
  
  return deployedAddress;
}

// Run the deployment
main()
  .then((deployedAddress) => {
    console.log(`Contract deployed at address: ${deployedAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  });
