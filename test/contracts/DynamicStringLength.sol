pragma solidity ^0.4.2;

contract DynamicStringLength {
  string public testString;

  function set(string _s) public {
    testString = _s;
  }

  function confirmSetting(string _s) public view returns (bool) {
    return keccak256(abi.encodePacked(_s)) == keccak256(abi.encodePacked(testString));
  }
}
