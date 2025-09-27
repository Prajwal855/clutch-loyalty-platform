// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract NFTRewardSystem {
    address public nftToken;
    address public owner;
    address public loyaltyManager;
    
    // Hedera Token Service address (system contract)
    address constant HTS_ADDRESS = 0x0000000000000000000000000000000000000167;
    HederaTokenService hts = HederaTokenService(HTS_ADDRESS);
    
    struct Achievement {
        string name;
        string description;
        string imageURI;
        uint256 requiredSpending;
        bool isActive;
    }
    
    mapping(uint256 => Achievement) public achievements;
    mapping(address => mapping(uint256 => bool)) public userAchievements;
    uint256 public nextAchievementId = 1;
    
    event AchievementCreated(uint256 indexed achievementId, string name);
    event NFTMinted(address indexed user, uint256 achievementId, string name);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyLoyaltyManager() {
        require(msg.sender == loyaltyManager, "Only loyalty manager");
        _;
    }
    
    constructor(address _nftToken, address _loyaltyManager) {
        nftToken = _nftToken;
        loyaltyManager = _loyaltyManager;
        owner = msg.sender;
        
        // Create default achievements
        createAchievement("First Purchase", "Made your first purchase", "ipfs://first-purchase", 100);
        createAchievement("Big Spender", "Spent over $100", "ipfs://big-spender", 10000);
        createAchievement("Loyalty Champion", "Spent over $500", "ipfs://champion", 50000);
        createAchievement("VIP Member", "Reached Platinum tier", "ipfs://vip", 100000);
    }
    
    function createAchievement(
        string memory name,
        string memory description,
        string memory imageURI,
        uint256 requiredSpending
    ) public onlyOwner {
        achievements[nextAchievementId] = Achievement({
            name: name,
            description: description,
            imageURI: imageURI,
            requiredSpending: requiredSpending,
            isActive: true
        });
        
        emit AchievementCreated(nextAchievementId, name);
        nextAchievementId++;
    }
    
    function mintAchievementNFT(address user, uint256 achievementId) external onlyLoyaltyManager {
        require(achievements[achievementId].isActive, "Achievement not active");
        require(!userAchievements[user][achievementId], "Already earned this achievement");
        
        // Create metadata for NFT
        bytes[] memory metadata = new bytes[](1);
        metadata[0] = abi.encode(achievements[achievementId].imageURI);
        
        // Mint NFT
        int response = hts.mintToken(nftToken, 0, metadata);
        require(response == HederaResponseCodes.SUCCESS, "NFT mint failed");
        
        userAchievements[user][achievementId] = true;
        
        emit NFTMinted(user, achievementId, achievements[achievementId].name);
    }
    
    function checkEligibleAchievements(address user, uint256 userTotalSpent) external view returns (uint256[] memory eligibleIds) {
        uint256[] memory tempEligible = new uint256[](nextAchievementId);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextAchievementId; i++) {
            if (
                achievements[i].isActive &&
                !userAchievements[user][i] &&
                userTotalSpent >= achievements[i].requiredSpending
            ) {
                tempEligible[count] = i;
                count++;
            }
        }
        
        // Return array with exact size
        eligibleIds = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            eligibleIds[j] = tempEligible[j];
        }
        
        return eligibleIds;
    }
    
    function updateLoyaltyManager(address newLoyaltyManager) external onlyOwner {
        loyaltyManager = newLoyaltyManager;
    }
}
