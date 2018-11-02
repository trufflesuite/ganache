pragma solidity ^0.4.2;

contract BlockGasLimit {
  function expensiveOperation(uint256 iterations) public view returns (uint256) {
    uint256 startGas = gasleft();
    uint256 result;

    for (uint256 i = 0; i < iterations; i++) {
      result = i;
    }

    return startGas - gasleft();
  }   
  
  function pureExpensiveOperation(uint256 iterations) public pure returns (bool) {
    uint256 result;

    for (uint256 i = 0; i < iterations; i++) {
      result = i;
    }

    return true;
  }  
}
