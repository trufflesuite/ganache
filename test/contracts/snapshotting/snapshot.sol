pragma solidity ^0.6.0;

contract snapshot {
    uint public n = 42;

    function inc() public {
        n += 1;
    }
}
