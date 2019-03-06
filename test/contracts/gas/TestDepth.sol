pragma solidity ^0.4.13;

contract TestDepth {
    uint256 public x;

    function depth(uint256 y) public {
        // bool result;
        if (y > 0) {
            bool result = this.delegatecall(bytes4(keccak256("depth(uint256)")), --y);
            require(result);
        }
        else {
             // Save the remaining gas in storage so that we can access it later
            x = msg.gas;
        }
    }
}
