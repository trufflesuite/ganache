pragma solidity ^0.4.2;

contract Call {
  constructor() public {}

  function theAnswerToLifeTheUniverseAndEverything() public pure returns (int256) {
    return 42;
  }

  function causeReturnValueOfUndefined() public pure returns (bool) {
    require(false);
    return true;
  }
}