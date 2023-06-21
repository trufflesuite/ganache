// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract DebugStorage {
  uint public value;
  uint public valueTwo;
  string public valueThree;
  uint public value4;

  event ValueSet(uint);

  constructor() payable {
    value = 5;
    valueTwo = 1;
    valueThree = "hello world";
  }

  function setValue(uint val) public {
    value = val;
    emit ValueSet(val);
  }

  function setValue4(uint val) public {
    // this value is _not_ set in the constructor so that we can
    // test storageRangeAt at different moments in the block
    value4 = val;
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
