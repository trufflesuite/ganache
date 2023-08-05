// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract snapshot {
    uint256 public n = 42;

    function inc() public {
        n += 1;
    }
}
