// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
contract GasLeft {
    uint x = 0;
    function checkGas() public {
      require(gasleft() > 100000, "Need 100000 gas");
      x = 1;
    }
}