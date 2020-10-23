// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

contract HelloWorld {
  uint public value;

  event ValueSet(uint);

  constructor() payable {
    value = 5;
  }

  function setValue(uint val) public {
    value = val;
    emit ValueSet(val);
  }

  function getConstVal() public pure returns (uint8) {
    return 123;
  }
}
