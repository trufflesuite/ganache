pragma solidity ^0.4.2;
import "./DynamicStringLengthCheck.sol";

contract DynamicStringLength {
  string public testString;
  DynamicStringLengthCheck validate = new DynamicStringLengthCheck();

  function set(string _s) public {
    testString = _s;
    validate.stringSetting(_s, testString);
  }

  function confirmSetting(string _s) public view returns (bool) {
    return keccak256(abi.encodePacked(_s)) == keccak256(abi.encodePacked(testString));
  }
}
