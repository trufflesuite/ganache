// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Merge {
    uint256 public difficulty;

    constructor() {
        require(block.difficulty > 1);
        difficulty = block.difficulty;
    }

    function getCurrentDifficulty() public view returns (uint256) {
        require(block.difficulty > 1);
        return uint256(block.difficulty);
    }
}
