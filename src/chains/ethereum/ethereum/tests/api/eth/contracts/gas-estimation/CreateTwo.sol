// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract CreateTwo {
  event RelayAddress(address addr, uint256 salt);
  function deploy(bytes memory code, uint256 salt) public {
    address addr;
    assembly {
      addr := create2(0, add(code, 0x20), mload(code), salt)
      if iszero(addr) {
        revert(0, 0)
      }
    }
    emit RelayAddress(addr, salt);
  }
}