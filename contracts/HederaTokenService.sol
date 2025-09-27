// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface HederaTokenService {
    function transferToken(address token, address from, address to, int64 amount) external returns (int responseCode);
    function mintToken(address token, int64 amount, bytes[] memory metadata) external returns (int responseCode);
    function burnToken(address token, int64 amount, int64[] memory serialNumbers) external returns (int responseCode);
    function associateTokens(address account, address[] memory tokens) external returns (int responseCode);
    function dissociateTokens(address account, address[] memory tokens) external returns (int responseCode);
}
