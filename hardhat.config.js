import "@nomiclabs/hardhat-ethers";
import dotenv from "dotenv";
dotenv.config();

export default {
  solidity: {
    version: "0.8.7",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    hedera_testnet: {
      url: "https://testnet.hedera.com",
      chainId: 296,
      accounts: process.env.HEDERA_PRIVATE_KEY ? [process.env.HEDERA_PRIVATE_KEY] : []
    }
  }
};
