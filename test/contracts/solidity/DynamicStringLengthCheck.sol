pragma solidity ^0.4.24;

contract DynamicStringLengthCheck {
  function stringSettingExternally(string oldText, string newText) pure public {
    require(keccak256(abi.encodePacked(oldText)) == keccak256(abi.encodePacked(newText)));
  }
}
