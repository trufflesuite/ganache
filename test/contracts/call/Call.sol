pragma solidity ^0.5.0;

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
