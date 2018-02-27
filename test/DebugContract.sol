pragma solidity ^0.4.2;

// Changes to this file will make tests fail.
contract DebugContract {
  uint public value = 5;
  uint public otherValue = 5;

  function setValue(uint _val) {
    value = _val;
    otherValue += _val;
  }
}
