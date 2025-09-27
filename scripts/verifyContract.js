import { get } from 'axios';
import { readFileSync } from 'fs';
require('dotenv').config();

/**
 * Compare Hedera deployed contract bytecode with your locally compiled bytecode
 * @param {string} contractId - Hedera contract ID (e.g., '0.0.1234567')
 * @param {string} compiledJsonPath - Path to compiled contract JSON artifact (from hardhat)
 */
async function verifyContractBytecode(contractId, compiledJsonPath) {
  try {

    const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/contracts/${contractId}/bytecode`;
    const { data: deployedBytecode } = await get(mirrorNodeUrl);

    const compiledJson = JSON.parse(readFileSync(compiledJsonPath, 'utf8'));
    let compiledBytecode = compiledJson.bytecode;

    const normalizedDeployedBytecode = deployedBytecode.replace(/^0x/, '').toLowerCase();
    const normalizedCompiledBytecode = compiledBytecode.replace(/^0x/, '').toLowerCase();

    if (normalizedDeployedBytecode.length !== normalizedCompiledBytecode.length) {
      console.error(`Deployed bytecode length: ${normalizedDeployedBytecode.length}`);
      console.error(`Compiled bytecode length: ${normalizedCompiledBytecode.length}`);
      return false;
    }

    if (normalizedDeployedBytecode === normalizedCompiledBytecode) {
      console.log(`Contract ${contractId} bytecode matches compiled contract.`);
      return true;
    } else {

      for (let i = 0; i < normalizedCompiledBytecode.length; i += 2) {
        if (normalizedCompiledBytecode.slice(i, i + 2) !== normalizedDeployedBytecode.slice(i, i + 2)) {
          console.error(`Compiled byte: ${normalizedCompiledBytecode.slice(i, i + 2)}, Deployed byte: ${normalizedDeployedBytecode.slice(i, i + 2)}`);
          break;
        }
      }
      console.error('Bytecode does not match compiled artifact.');
      return false;
    }
  } catch (error) {
    console.error('Error verifying contract bytecode:', error.message);
    return false;
  }
}

async function main() {

  const contractsToVerify = [
    {
      contractId: process.env.LOYALTY_CONTRACT_ID,
      artifactPath: './artifacts/contracts/LoyaltyManager.sol/LoyaltyManager.json'
    },
    {
      contractId: process.env.NFT_REWARD_CONTRACT_ID,
      artifactPath: './artifacts/contracts/NFTRewardSystem.sol/NFTRewardSystem.json'
    },
    {
      contractId: process.env.LOYALTY_STAKING_CONTRACT_ID,
      artifactPath: './artifacts/contracts/LoyaltyStaking.sol/LoyaltyStaking.json'
    },
    {
      contractId: process.env.SIMPLE_LOYALTY_CONTRACT_ID,
      artifactPath: './artifacts/contracts/SimpleLoyalty.sol/SimpleLoyalty.json'
    }
  ];

  for (const contract of contractsToVerify) {
    if (!contract.contractId) {
      console.warn(`Skipping verification, missing contract ID for ${contract.artifactPath}`);
      continue;
    }
    console.log(`\nVerifying contract: ${contract.contractId}`);
    const verified = await verifyContractBytecode(contract.contractId, contract.artifactPath);
    if (verified) {
      console.log(`Verification successful for ${contract.contractId}`);
    } else {
      console.error(`Verification FAILED for ${contract.contractId}`);
    }
  }
}

main();
