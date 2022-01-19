// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./NoOp.sol";

contract GetCode {
  address public noop;
  constructor() {
    noop = address(new NoOp());
  }
}
