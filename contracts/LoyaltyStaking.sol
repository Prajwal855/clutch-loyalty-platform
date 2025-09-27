// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract LoyaltyStaking {
    address public loyaltyToken;
    address public owner;
    
    // Hedera Token Service address (system contract)
    address constant HTS_ADDRESS = 0x0000000000000000000000000000000000000167;
    HederaTokenService hts = HederaTokenService(HTS_ADDRESS);
    
    uint256 public constant REWARD_RATE = 1000; // 10% APY (basis points)
    uint256 public constant SECONDS_IN_YEAR = 365 days;
    uint256 public constant MIN_STAKE_AMOUNT = 100; // Minimum 100 tokens to stake
    
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
        uint256 totalRewardsClaimed;
    }
    
    mapping(address => StakeInfo) public userStakes;
    uint256 public totalStaked;
    uint256 public totalRewardsPaid;
    
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 rewards, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor(address _loyaltyToken) {
        loyaltyToken = _loyaltyToken;
        owner = msg.sender;
    }
    
    function stake(uint256 amount) external {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum stake");
        
        // Claim pending rewards before staking more
        if (userStakes[msg.sender].amount > 0) {
            claimRewards();
        }
        
        // Transfer tokens from user to contract
        int response = hts.transferToken(
            loyaltyToken,
            msg.sender,
            address(this),
            int64(uint64(amount))
        );
        
        require(response == HederaResponseCodes.SUCCESS, "Stake transfer failed");
        
        // Update stake info
        StakeInfo storage userStake = userStakes[msg.sender];
        userStake.amount += amount;
        userStake.startTime = block.timestamp;
        userStake.lastClaimTime = block.timestamp;
        
        totalStaked += amount;
        
        emit Staked(msg.sender, amount, block.timestamp);
    }
    
    function unstake(uint256 amount) external {
        StakeInfo storage userStake = userStakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked amount");
        
        // Claim rewards before unstaking
        claimRewards();
        
        // Update stake info
        userStake.amount -= amount;
        totalStaked -= amount;
        
        // Transfer tokens back to user
        int response = hts.transferToken(
            loyaltyToken,
            address(this),
            msg.sender,
            int64(uint64(amount))
        );
        
        require(response == HederaResponseCodes.SUCCESS, "Unstake transfer failed");
        
        emit Unstaked(msg.sender, amount, block.timestamp);
    }
    
    function claimRewards() public {
        StakeInfo storage userStake = userStakes[msg.sender];
        require(userStake.amount > 0, "No stake found");
        
        uint256 rewards = calculatePendingRewards(msg.sender);
        
        if (rewards > 0) {
            userStake.lastClaimTime = block.timestamp;
            userStake.totalRewardsClaimed += rewards;
            totalRewardsPaid += rewards;
            
            // Mint new tokens as rewards
            bytes[] memory metadata = new bytes[](0);
            int response = hts.mintToken(
                loyaltyToken,
                int64(uint64(rewards)),
                metadata
            );
            
            require(response == HederaResponseCodes.SUCCESS, "Reward mint failed");
            
            emit RewardsClaimed(msg.sender, rewards, block.timestamp);
        }
    }
    
    function calculatePendingRewards(address user) public view returns (uint256) {
        StakeInfo memory userStake = userStakes[user];
        
        if (userStake.amount == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp - userStake.lastClaimTime;
        uint256 rewards = (userStake.amount * REWARD_RATE * stakingDuration) / (10000 * SECONDS_IN_YEAR);
        
        return rewards;
    }
    
    function getUserStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 totalClaimed,
        uint256 stakingDuration
    ) {
        StakeInfo memory userStake = userStakes[user];
        
        return (
            userStake.amount,
            calculatePendingRewards(user),
            userStake.totalRewardsClaimed,
            userStake.startTime > 0 ? block.timestamp - userStake.startTime : 0
        );
    }
    
    function emergencyWithdraw() external {
        StakeInfo storage userStake = userStakes[msg.sender];
        uint256 amount = userStake.amount;
        
        require(amount > 0, "No stake to withdraw");
        
        userStake.amount = 0;
        totalStaked -= amount;
        
        int response = hts.transferToken(
            loyaltyToken,
            address(this),
            msg.sender,
            int64(uint64(amount))
        );
        
        require(response == HederaResponseCodes.SUCCESS, "Emergency withdrawal failed");
        
        emit Unstaked(msg.sender, amount, block.timestamp);
    }
}
