pragma solidity ^0.4.2;

contract ContractFactory5{
    constructor() public {
    }
}
contract ContractFactory4{
    address[] addresses;
    constructor() public {
        for(uint i=0; i < 2; i++){
            addresses.push(new ContractFactory5());
        }
    }
}
contract ContractFactory2{
    address public test2;
    constructor() public {
        test2 = new ContractFactory3();
    }
}

contract ContractFactory3{
    address public test2;
    address[] addresses;
    constructor() public {
        test2 = new ContractFactory4();

        for(uint i=0; i < 2; i++){
            addresses.push(new ContractFactory4());
        }
    }
}

contract ContractFactory{
    function createInstance() public{
        address test2 = new ContractFactory2();
        address test3 = new ContractFactory4();
    }
}
