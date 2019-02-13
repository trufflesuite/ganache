pragma solidity ^0.4.24;
import "./DynamicStringLengthCheck.sol";

contract DynamicStringLength {
  string public testString;
  DynamicStringLengthCheck validate = new DynamicStringLengthCheck();

  function setAndConfirm(string _s) public {
    testString = _s;
    require(confirmStringInternally(_s));
    validate.stringSettingExternally(_s, testString);
  }

  function confirmStringInternally(string _s) public view returns (bool) {
    return keccak256(abi.encodePacked(_s)) == keccak256(abi.encodePacked(testString));
  }
}
