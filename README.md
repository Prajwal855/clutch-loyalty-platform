# Clutch Loyalty Platform

A full-stack decentralized loyalty rewards application integrating Hedera Hashgraph smart contracts, PayPal sandbox payments, and a Ruby on Rails backend with a React frontend.

## Features

- **Loyalty Points**  
  - Issue and manage fungible “Loyalty Points” tokens on Hedera Testnet  
  - Tiered rewards (Bronze, Silver, Gold, Platinum)  
  - Automatic point calculation and tier upgrades  

- **Achievement NFTs**  
  - Mint non-fungible “Achievement” NFTs for milestones  
  - Configurable achievements with metadata stored on IPFS  

- **Staking**  
  - Stake Loyalty Points to earn additional rewards  
  - Track staked amounts, pending rewards, and total claimed  

- **Payments**  
  - PayPal sandbox integration for on-ramp of USD to Loyalty Points  
  - Secure backend confirmation and smart-contract invocation  

- **Full Hedera Integration**  
  - HTS token creation, transfers, minting and burning  
  - Solidity smart contracts deployed and verified on Hedera Testnet  

## Folder Structure

```
clutch-loyalty-platform/
├── backend/                # Rails API backend
│   ├── app/
│   ├── config/
│   └── services/           # PayPal & Hedera service integrations
├── contracts/              # Solidity smart contracts
│   ├── HederaTokenService.sol
│   ├── HederaResponseCodes.sol
│   ├── LoyaltyManager.sol
│   ├── NFTRewardSystem.sol
│   ├── LoyaltyStaking.sol
│   └── SimpleLoyalty.sol
├── frontend/               # React.js application
│   ├── src/
│   └── public/
├── scripts/                # Deployment & verification scripts
│   ├── createToken.js
│   ├── deployContract.js
│   └── verifyContracts.js
├── hardhat.config.js       # Hardhat configuration
├── package.json
├── .env.example            # Template for environment variables
└── README.md
```

## Prerequisites

- Node.js (v18.x LTS)  
- npm  
- Ruby & Rails  
- Hedera Testnet account & private key  
- PayPal sandbox credentials  

## Setup

1. **Clone repository**  
   ```bash
   git clone <repository-url>
   cd clutch-loyalty-platform
   ```

2. **Environment**  
   Copy and edit the `.env` file:
   ```bash
   cp .env.example .env
   ```
   Fill in your Hedera account ID, private key, token and contract IDs, and PayPal credentials.

3. **Install dependencies**  
   ```bash
   npm install
   bundle install --path vendor/bundle
   ```

4. **Compile smart contracts**  
   ```bash
   npx hardhat compile
   ```

5. **Create tokens on Hedera Testnet**  
   ```bash
   node scripts/createToken.js
   ```
   Copy the generated `LOYALTY_TOKEN_ID` and `NFT_TOKEN_ID` into your `.env`.

6. **Deploy contracts**  
   ```bash
   node scripts/deployContract.js
   ```
   Copy the generated contract IDs into your `.env`.

7. **Verify contracts** (optional)  
   ```bash
   node scripts/verifyContracts.js
   ```

8. **Migrate & seed database**  
   ```bash
   rails db:migrate db:seed
   ```

9. **Start backend & frontend**  
   ```bash
   rails server -p 3001
   npm start --prefix frontend
   ```

10. **Access the app**  
    Open your browser at `http://localhost:3000`

## Usage

- Connect your Hedera wallet (HashPack) in the frontend  
- Create a PayPal sandbox payment to purchase Loyalty Points  
- Backend confirms payment and awards points via smart contract  
- View and redeem points in the dashboard  
- Stake points or claim NFT achievements as you reach milestones  

***

Build, test, and customize further to suit your loyalty program needs. Enjoy!