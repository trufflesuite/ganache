// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Call {
  uint256 public value = 0;
  function setValue (uint256 newValue) public returns (uint256 oldValue) {
    oldValue = value;
    value = newValue;
  }

  function setValueForAddress(address target, uint256 newValue) public returns (bytes memory oldValue) {
    bytes memory data = abi.encodeWithSignature("setValue(uint256)", newValue);
    (bool success, bytes memory _oldValue) = target.call(data);
    require(success);
    oldValue = _oldValue;
  }

  function setValueForAddressAddress(address target1, address target2, uint256 newValue) public returns (bytes memory oldValue) {
    bytes memory data1 = abi.encodeWithSignature("setValueForAddress(address,uint256)", target2, newValue-1);
    (bool success1, ) = address(this).call(data1);
    require(success1);
    bytes memory data = abi.encodeWithSignature("setValueForAddress(address,uint256)", target2, newValue);
    (bool success, bytes memory _oldValue) = target1.call(data);
    require(success);
    oldValue = _oldValue;
  }
}