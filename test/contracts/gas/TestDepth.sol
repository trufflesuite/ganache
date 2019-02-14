pragma solidity ^0.4.13;

contract TestDepth {
    uint256 public x;

    function depth(uint256 y) {
        if (y > 0) {
            this.delegatecall(bytes4(sha3('depth(uint256)')), --y);
        }
        else {
             // Save the remaining gas in storage so that we can access it later
             x = msg.gas;
        }
    }
}
