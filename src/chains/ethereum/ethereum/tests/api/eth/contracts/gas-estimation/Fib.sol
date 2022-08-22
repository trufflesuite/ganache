// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Fib {
    constructor() {}
    uint public value = 0;

    fallback() external payable {
        Bif bif = new Bif();
        value = bif.calc(5);
    }
}

contract Bif {
    constructor() {}

    function calc(uint index) public returns(uint){
        if (index <= 1) {
            return 1;
        }
        return calc(index - 1) + calc(index - 2);
    }
}
