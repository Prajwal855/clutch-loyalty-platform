// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract LoyaltyManager {
    address public loyaltyToken;
    address public owner;
    
    // Hedera Token Service address (system contract)
    address constant HTS_ADDRESS = 0x0000000000000000000000000000000000000167;
    HederaTokenService hts = HederaTokenService(HTS_ADDRESS);
    
    // User data mappings
    mapping(address => uint256) public userTotalSpent;
    mapping(address => uint256) public userTier; // 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
    mapping(address => uint256) public userLastActivity;
    mapping(address => bool) public userKYCVerified;
    
    // Tier thresholds (in cents)
    uint256 public constant SILVER_THRESHOLD = 1000;   // $10
    uint256 public constant GOLD_THRESHOLD = 5000;     // $50
    uint256 public constant PLATINUM_THRESHOLD = 10000; // $100
    
    event PointsAwarded(address indexed user, uint256 points, uint256 tier, uint256 totalSpent);
    event PointsRedeemed(address indexed user, uint256 points, string item);
    event TierUpgraded(address indexed user, uint256 oldTier, uint256 newTier);
    event KYCVerified(address indexed user);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor(address _loyaltyToken) {
        loyaltyToken = _loyaltyToken;
        owner = msg.sender;
    }
    
    function awardPoints(
        address user,
        uint256 spentCents,
        string memory ref
    ) external onlyOwner returns (uint256 pointsAwarded) {
        // Calculate base points (1 cent = 1 point)
        uint256 basePoints = spentCents;
        
        // Apply tier multiplier
        uint256 currentTier = userTier[user];
        uint256 multiplier = getTierMultiplier(currentTier);
        pointsAwarded = (basePoints * multiplier) / 100;
        
        // Transfer loyalty tokens to user
        int response = hts.transferToken(
            loyaltyToken,
            owner,
            user,
            int64(uint64(pointsAwarded))
        );
        
        require(response == HederaResponseCodes.SUCCESS, "Token transfer failed");
        
        // Update user data
        userTotalSpent[user] += spentCents;
        userLastActivity[user] = block.timestamp;
        
        // Check for tier upgrade
        uint256 newTier = calculateTier(userTotalSpent[user]);
        if (newTier > currentTier) {
            emit TierUpgraded(user, currentTier, newTier);
            userTier[user] = newTier;
        }
        
        emit PointsAwarded(user, pointsAwarded, userTier[user], userTotalSpent[user]);
        
        return pointsAwarded;
    }
    
    function redeemPoints(uint256 pointsToRedeem, string memory itemName) external {
        // Transfer points from user back to treasury (burn)
        int response = hts.transferToken(
            loyaltyToken,
            msg.sender,
            owner,
            int64(uint64(pointsToRedeem))
        );
        
        require(response == HederaResponseCodes.SUCCESS, "Token transfer failed");
        
        userLastActivity[msg.sender] = block.timestamp;
        
        emit PointsRedeemed(msg.sender, pointsToRedeem, itemName);
    }
    
    function verifyKYC(address user) external onlyOwner {
        userKYCVerified[user] = true;
        emit KYCVerified(user);
    }
    
    function getTierMultiplier(uint256 tier) internal pure returns (uint256) {
        if (tier == 0) return 100;  // Bronze: 1x
        if (tier == 1) return 150;  // Silver: 1.5x
        if (tier == 2) return 200;  // Gold: 2x
        return 300;                 // Platinum: 3x
    }
    
    function calculateTier(uint256 totalSpent) internal pure returns (uint256) {
        if (totalSpent >= PLATINUM_THRESHOLD) return 3;
        if (totalSpent >= GOLD_THRESHOLD) return 2;
        if (totalSpent >= SILVER_THRESHOLD) return 1;
        return 0;
    }
    
    function getTierName(uint256 tier) internal pure returns (string memory) {
        if (tier == 0) return "Bronze";
        if (tier == 1) return "Silver";
        if (tier == 2) return "Gold";
        return "Platinum";
    }
    
    function getUserProfile(address user) external view returns (
        uint256 totalSpent,
        uint256 tier,
        uint256 lastActivity,
        bool kycVerified,
        string memory tierName
    ) {
        return (
            userTotalSpent[user],
            userTier[user],
            userLastActivity[user],
            userKYCVerified[user],
            getTierName(userTier[user])
        );
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
