// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library HederaResponseCodes {
    int32 public constant SUCCESS = 22;
    int32 public constant INVALID_TOKEN_ID = 23;
    int32 public constant INSUFFICIENT_TOKEN_BALANCE = 24;
    int32 public constant TOKEN_NOT_ASSOCIATED_TO_ACCOUNT = 25;
}
