pragma solidity ^0.4.2;

contract DynamicStringLength {
  string public testString;

  function set(string _s) public {
    testString = _s;
  }
}
