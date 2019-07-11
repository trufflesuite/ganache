pragma solidity ^0.5.0;
contract Example2 { 
  constructor() public {
    revert("I am not suppose to work");
  }
}
