// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Debug {
  uint public value;

  event ValueSet(uint);

  constructor() payable {
    value = 5;
  }

  function setValue(uint val) public {
    value = val;
    emit ValueSet(val);
  }

  function loop(uint times) public {
    for (uint i = 0; i < times; i++) {
      value += i;
    }
  }

  function doARevert() public pure {
    revert("all your base");
  }
}
