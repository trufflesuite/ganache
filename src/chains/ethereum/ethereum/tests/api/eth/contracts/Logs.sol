// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Logs {
    event Event(uint256 indexed first, uint256 indexed second);

    constructor() {
        emit Event(1, 2);
    }

    function logNTimes(uint8 n) public {
        for (uint8 i = 0; i < n; i++) {
            emit Event(i, i);
        }
    }
}
