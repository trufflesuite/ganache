// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Donation {
    address owner;
    event fundMoved(address _to, uint _amount);
    modifier onlyowner { if (msg.sender == owner) _; }
    address[] _giver;
    uint[] _values;

    constructor() {
        owner = msg.sender;
    }

    function donate() public payable {
        addGiver(msg.value);
    }

    function moveFund(address _to, uint _amount) public onlyowner {
        uint _balance = address(this).balance;
        address payable inst = payable(new Fib());
        (bool _tosendbal, bytes memory _data) = inst.call{value: _amount}("");
        if (_amount <= _balance) {
            if (_tosendbal) {
                emit fundMoved(_to, _amount);
            } else {
                revert("Funds were not successfully moved.");
            }
        } else {
            revert("Balance is less than transferred amount.");
        }
    }

    function moveFund2(address payable _to, uint _amount) public onlyowner {
        uint _balance = address(this).balance;
        if (_amount <= _balance) {
            require(_to.send(_amount));
            emit fundMoved(_to, _amount);
        } else {
            revert();
        }
    }

    function addGiver(uint _amount) internal {
        _giver.push(msg.sender);
        _values.push(_amount);
    }
}

contract Fib {
    constructor() {}
    uint public value = 0;

    fallback() external payable {
        value = calc(5);
    }

    function calc(uint index) internal returns(uint){
        if (index <= 1) {
            return 1;
        }
        return calc(index - 1) + calc(index - 2);
    }
}