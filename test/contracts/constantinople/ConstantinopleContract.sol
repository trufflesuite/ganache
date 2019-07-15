pragma solidity ^0.5.0;

// Changes to this file will make tests fail.
contract ConstantinopleContract {
  function test(uint8 shift) pure public returns (bytes32 value) {
    assembly {
      value := shl(shift, 1) 
    }
  }
}
