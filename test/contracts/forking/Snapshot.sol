pragma solidity ^0.6.0;

contract Snapshot {
  uint public value;

  constructor() public {
    value = 0;
  }

  function test() public {
    value = value + 1;
  }
}
