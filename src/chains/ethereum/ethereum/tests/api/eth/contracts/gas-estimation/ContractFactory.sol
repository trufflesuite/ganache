// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract ContractFactory5{
    constructor() {}
}
contract ContractFactory4{
    address[] addresses;
    constructor() {
        for(uint i=0; i < 2; i++){
            addresses.push(address(new ContractFactory5()));
        }
    }
}
contract ContractFactory2{
    address public test2;
    constructor() {
        test2 = address(new ContractFactory3());
    }
}

contract ContractFactory3{
    address public test2;
    address[] addresses;
    constructor() {
        test2 = address(new ContractFactory4());

        for(uint i=0; i < 2; i++){
            addresses.push(address(new ContractFactory4()));
        }
    }
}

contract ContractFactory{
    event UsefulEvent(address factory1, address factory2);
    function createInstance() public {
        address test2 = address(new ContractFactory2());
        address test3 = address(new ContractFactory4());
        emit UsefulEvent(test2, test3);
    }
}