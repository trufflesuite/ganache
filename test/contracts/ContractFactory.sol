pragma solidity ^0.4.2;

contract ContractFactory2{
  constructor() {
  }
}

contract ContractFactory{
  function createInstance() public{
    address test2 = new ContractFactory2();
  }
}
