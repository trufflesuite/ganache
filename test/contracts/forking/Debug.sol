pragma solidity ^0.6.0;

contract Debug {
  uint public value;

  constructor() public {
    value = 1;
  }

  function test() public mod() returns (uint) {
    value = value + 1;
    return value;
  }

  modifier mod() {
    require(value < 2);
    _;
  }
}
