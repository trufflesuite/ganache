pragma solidity ^0.4.2;

contract ContractFactory4{
  constructor() public {
  }
}
contract ContractFactory3{
  address public test2;
  constructor() public {
    test2 = new ContractFactory4();
  }
}
contract ContractFactory2{
  address public test2;
  constructor() public {
    test2 = new ContractFactory3();
  }
}

contract ContractFactory{
  function createInstance() public{
    address test2 = new ContractFactory2();
    address test3 = new ContractFactory4();
  }
}
