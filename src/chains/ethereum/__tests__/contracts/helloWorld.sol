pragma solidity ^0.6.1;

contract HelloWorld {
  uint public value;

  event ValueSet(uint);

  constructor() public payable {
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
