const { Client, PrivateKey, AccountId, FileCreateTransaction, ContractCreateTransaction, ContractFunctionParameters, Hbar } = require("@hashgraph/sdk");
const fs = require("fs");
require("dotenv").config();

async function deployContract(contractName = "LoyaltyManager") {
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
    PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
  );

  // Read compiled contract
  const contractJson = JSON.parse(
    fs.readFileSync(`./artifacts/contracts/${contractName}.sol/${contractName}.json`, 'utf8')
  );
  
  const bytecode = contractJson.bytecode.replace(/^0x/, '');
  const bytecodeBuffer = Buffer.from(bytecode, 'hex');

  console.log(`Deploying ${contractName}...`);

  // Upload bytecode
  const fileCreateTx = new FileCreateTransaction()
    .setContents(bytecodeBuffer)
    .setMaxTransactionFee(new Hbar(5));
  
  const fileCreateSubmit = await fileCreateTx.execute(client);
  const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
  const bytecodeFileId = fileCreateReceipt.fileId;
  
  console.log(`Bytecode uploaded: ${bytecodeFileId}`);

  // Deploy contract
  let contractCreateTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(1000000)
    .setMaxTransactionFee(new Hbar(10));

  // Add constructor parameters based on contract
  if (contractName === "LoyaltyManager") {
    contractCreateTx = contractCreateTx.setConstructorParameters(
      new ContractFunctionParameters().addAddress(process.env.LOYALTY_TOKEN_ID)
    );
  } else if (contractName === "NFTRewardSystem") {
    contractCreateTx = contractCreateTx.setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress(process.env.NFT_TOKEN_ID)
        .addAddress(process.env.LOYALTY_CONTRACT_ID)
    );
  } else if (contractName === "LoyaltyStaking") {
    contractCreateTx = contractCreateTx.setConstructorParameters(
      new ContractFunctionParameters().addAddress(process.env.LOYALTY_TOKEN_ID)
    );
  }

  const contractCreateSubmit = await contractCreateTx.execute(client);
  const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
  const contractId = contractCreateReceipt.contractId;

  console.log(`✅ ${contractName} deployed: ${contractId}`);
  console.log(`Add to .env: ${contractName.toUpperCase()}_CONTRACT_ID=${contractId}`);
  
  return contractId;
}

async function main() {
  try {
    console.log("🚀 Starting contract deployment...\n");
    
    const loyaltyManagerId = await deployContract("LoyaltyManager");

    const simpleLoyaltyId = await deployContract("SimpleLoyalty");

    const stakingId = await deployContract("LoyaltyStaking");

    if (process.env.NFT_TOKEN_ID) {
      const nftRewardsId = await deployContract("NFTRewardSystem");
    }
    
    console.log("All contracts deployed successfully!");
    console.log("Add these to your .env file:");
    console.log(`LOYALTY_CONTRACT_ID=${loyaltyManagerId}`);
    console.log(`SIMPLE_LOYALTY_CONTRACT_ID=${simpleLoyaltyId}`);
    console.log(`STAKING_CONTRACT_ID=${stakingId}`);
    
  } catch (error) {
    console.error("Deployment failed:", error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { deployContract };
