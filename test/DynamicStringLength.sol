pragma solidity ^0.4.2;

contract DynamicStringLength {
  string public testString;
  uint public testId = 246;

  event StringAnnounce(string text, uint id);

  function set(string _s) public {
    testString = _s;
  }
}
