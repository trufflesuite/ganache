pragma solidity ^0.4.21;

contract Fib {
    function Fib() public {
    }
    uint public value = 0;

    function() public payable {
        Bif bif = new Bif();
        value = bif.calc(5);
    }
}

contract Bif {
    function Bif() public {
    }

    function calc(uint index) public returns(uint){
        if (index <= 1) {
            return 1;
        }
        return calc(index - 1) + calc(index - 2);
    }
}
