pragma solidity ^0.6.0;

// Changes to this file will make tests fail.
contract DebugContract {
    uint public value = 5;
    uint public otherValue = 5;
    uint public currentBlock = 0;

    function setValue(uint _val) public {
        value = _val;
        otherValue += _val;
        currentBlock = block.number;
    }

    function callSetValueTwice() public {
        setValue(1);
        setValue(2);
    }

    function get() public view returns (uint) {
        return value;
    }

    function getOther() public view returns (uint) {
        return otherValue;
    }
}
