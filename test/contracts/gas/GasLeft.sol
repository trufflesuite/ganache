pragma solidity ^0.5.0;
contract GasLeft {
    uint x = 0;
    function checkGas() public {
      require(gasleft() > 100000, "Need 100000 gas");
      x = 1;
    }
}
