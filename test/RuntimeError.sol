pragma solidity ^0.4.2;

// Changes to this file will make tests fail.
contract RuntimeError {
  function error() {
    for (uint i = 0; i < 3; ) {
      i++;
    }
    throw;
  }

  function success() {

  }
}
