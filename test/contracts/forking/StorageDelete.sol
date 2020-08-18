pragma solidity ^0.6.0;

contract StorageDelete {
  bool entered;

  constructor() public {
    entered = true;
  }

  function test() public nonReentrant {}

  modifier nonReentrant() {
    require(entered, "re-entered");
    entered = false;
    _;
    entered = true;
  }
}
