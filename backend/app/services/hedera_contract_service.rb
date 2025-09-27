require 'json'
require 'open3'

class HederaContractService
  def initialize
    @account_id = ENV['HEDERA_ACCOUNT_ID']
    @private_key = ENV['HEDERA_PRIVATE_KEY']
    @contract_id = ENV['LOYALTY_CONTRACT_ID']
  end

  def award_points(user_wallet_address, spent_cents, reference)
    script = <<~JS
      const { Client, PrivateKey, ContractExecuteTransaction, ContractFunctionParameters } = require("@hashgraph/sdk");

      async function main() {
        const client = Client.forTestnet();
        client.setOperator("#{ @account_id }", "#{ @private_key }");

        const contractExecuteTx = new ContractExecuteTransaction()
          .setContractId("#{ @contract_id }")
          .setGas(100000)
          .setFunction("awardPoints", 
            new ContractFunctionParameters()
              .addAddress("#{ user_wallet_address }")
              .addUint256(#{ spent_cents })
              .addString("#{ reference }"));

        const txResponse = await contractExecuteTx.execute(client);
        const receipt = await txResponse.getReceipt(client);

        console.log(JSON.stringify({ success: true, transactionId: txResponse.transactionId.toString(), status: receipt.status.toString() }));
      }

      main().catch(err => console.log(JSON.stringify({ success: false, error: err.message })));
    JS

    stdout, stderr, status = Open3.capture3('node', '-e', script)

    if status.success?
      JSON.parse(stdout)
    else
      { success: false, error: stderr }
    end
  end
end
