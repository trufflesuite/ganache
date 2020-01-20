pragma solidity ^0.6.0;

contract Donation {
    address owner;
    event fundMoved(address _to, uint _amount);
    modifier onlyowner { if (msg.sender == owner) _; }
    address[] _giver;
    uint[] _values;

    constructor() public {
        owner = msg.sender;
    }

    function donate() public payable {
        addGiver(msg.value);
    }

    function moveFund(address _to, uint _amount) public onlyowner {
        uint _balance = address(this).balance;
        address payable inst = address(new Fib());
        bool _tosendbal = inst.send(_amount);
        if (_amount <= _balance) {
            if (_tosendbal) {
                emit fundMoved(_to, _amount);
            } else {
                revert();
            }
        } else {
            revert();
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
    constructor() public {}
    uint public value = 0;

    fallback() external payable {
        calc(5);
    }

    function calc(uint index) internal returns(uint){
        if (index <= 1) {
            return 1;
        }
        return calc(index - 1) + calc(index - 2);
    }
}
