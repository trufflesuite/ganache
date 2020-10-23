// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

contract snapshot {
    uint public n = 42;

    function inc() public {
        n += 1;
    }
}
