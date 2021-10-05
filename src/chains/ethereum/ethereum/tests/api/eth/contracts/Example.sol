pragma solidity ^0.7.4;

contract Example {
  uint public value;

  event ValueSet(uint);

  constructor() public payable {
    value = 5;
  }

  function setValue(uint val) public {
    value = val;
    emit ValueSet(val);
  }

  function destruct() public {
    selfdestruct(msg.sender);
  }
}