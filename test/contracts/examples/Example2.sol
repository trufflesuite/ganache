pragma solidity ^0.6.0;
contract Example2 { 
  constructor() public {
    revert("I am not suppose to work");
  }
}
