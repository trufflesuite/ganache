pragma solidity ^0.7.4;

contract EthCall {
  uint public value;

  constructor() public payable {
    value = 5;
  }

}