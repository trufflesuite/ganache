// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

contract DebugStorage {
  uint public value;
  uint public valueTwo;
  string public valueThree;

  event ValueSet(uint);

  constructor() payable {
    value = 5;
    valueTwo = 1;
    valueThree = "hello rpdr";
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
