require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      // For Hardhat local network
    },
    pulseTestnet: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 943 // PulseChain Testnet v4
    }
  },
  paths: {
    sources: "./Contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
