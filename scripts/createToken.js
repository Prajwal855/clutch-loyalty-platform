const {
    Client,
    PrivateKey,
    AccountId,
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    Hbar
} = require("@hashgraph/sdk");

require("dotenv").config();

async function createLoyaltyToken() {
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
        PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );

    // Create loyalty token (fungible)
    const loyaltyTokenTx = new TokenCreateTransaction()
        .setTokenName("Loyalty Points")
        .setTokenSymbol("LP")
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(2)
        .setInitialSupply(1000000) 
        .setMaxSupply(100000000)
        .setTreasuryAccountId(process.env.HEDERA_ACCOUNT_ID)
        .setSupplyType(TokenSupplyType.Finite)
        .setSupplyKey(PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY))
        .setAdminKey(PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY))
        .setFreezeDefault(false)
        .setMaxTransactionFee(new Hbar(30))
        .freezeWith(client);
    const loyaltyTokenTxSigned = await loyaltyTokenTx.sign(
        PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );
    const loyaltyTokenResponse = await loyaltyTokenTxSigned.execute(client);
    const loyaltyTokenReceipt = await loyaltyTokenResponse.getReceipt(client);
    const loyaltyTokenId = loyaltyTokenReceipt.tokenId;

    return loyaltyTokenId;
}

async function createNFTToken() {
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.HEDERA_ACCOUNT_ID),
        PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );

    const nftTokenTx = new TokenCreateTransaction()
        .setTokenName("Loyalty Achievement NFTs")
        .setTokenSymbol("LANFT")
        .setTokenType(TokenType.NonFungibleUnique)
        .setSupplyType(TokenSupplyType.Infinite)
        .setInitialSupply(0) 
        .setTreasuryAccountId(process.env.HEDERA_ACCOUNT_ID)
        .setSupplyKey(PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY))
        .setAdminKey(PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY))
        .setMaxTransactionFee(new Hbar(30))
        .freezeWith(client);

    const nftTokenTxSigned = await nftTokenTx.sign(
        PrivateKey.fromString(process.env.HEDERA_PRIVATE_KEY)
    );
    const nftTokenResponse = await nftTokenTxSigned.execute(client);
    const nftTokenReceipt = await nftTokenResponse.getReceipt(client);
    const nftTokenId = nftTokenReceipt.tokenId;


    return nftTokenId;
}

async function main() {
    try {

        const loyaltyTokenId = await createLoyaltyToken();
        const nftTokenId = await createNFTToken();
        console.log("1. Update your .env file with the token IDs above");
        console.log("2. Run 'npx hardhat compile' to compile smart contracts");
        console.log("3. Run 'node scripts/deployContract.js' to deploy contracts");

        // Return both token IDs
        return {
            loyaltyTokenId: loyaltyTokenId.toString(),
            nftTokenId: nftTokenId.toString()
        };

    } catch (error) {
        console.error("Token creation failed:", error.message);
        
        if (error.message.includes("INVALID_ACCOUNT_ID")) {
            console.log("\n Account Id not found");
        }
        
        if (error.message.includes("INSUFFICIENT_ACCOUNT_BALANCE")) {
            console.log("\nYour account needs more HBAR balance for token creation fees");
        }

        process.exit(1);
    }
}

module.exports = {
    createLoyaltyToken,
    createNFTToken
};

if (require.main === module) {
    main();
}
