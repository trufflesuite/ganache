// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

contract HelloWorld {
    uint256 public value;

    event ValueSet(uint256);

    constructor() payable {
        value = 5;
    }

    function setValue(uint256 val) public {
        value = val;
        emit ValueSet(val);
    }

    function getConstVal() public pure returns (uint8) {
        return 123;
    }
}
