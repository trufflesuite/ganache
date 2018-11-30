pragma solidity ^0.4.2;

contract DynamicStringLengthCheck {
  function stringSettingExternally(string oldText, string newText) pure public {
    require(keccak256(abi.encodePacked(oldText)) == keccak256(abi.encodePacked(newText)));
  }
}
