pragma solidity ^0.4.2;

contract snapshot {
    uint public n = 42;

    function inc() public {
        n += 1;
    }
}
