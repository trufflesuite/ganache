pragma solidity ^0.5.0;

contract Fib {
    constructor() public {}
    uint public value = 0;

    function() external payable {
        Bif bif = new Bif();
        value = bif.calc(5);
    }
}

contract Bif {
    constructor() public {}

    function calc(uint index) public returns(uint){
        if (index <= 1) {
            return 1;
        }
        return calc(index - 1) + calc(index - 2);
    }
}
