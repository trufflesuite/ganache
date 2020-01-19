pragma solidity ^0.6.0;

// Changes to this file will make tests fail.
contract RuntimeError {
  function error() public {
    for (uint i = 0; i < 3; ) {
      i++;
    }
    revert();
  }

  function errorWithMessage() public {
    for (uint i = 0; i < 3; ) {
      i++;
    }
    revert("Message");
  }

  function success() public {

  }
}
