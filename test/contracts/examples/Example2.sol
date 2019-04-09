pragma solidity ^0.4.2;

contract Example2 { 
  constructor() public {
    revert("I am not suppose to work");
  }
}