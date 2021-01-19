// SPDX-License-Identifier: MIT
pragma solidity ^0.7.4;

import "./NoOp.sol";

contract GetCode {
  address public noop;
  constructor() {
    noop = address(new NoOp());
  }
}
