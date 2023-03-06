// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract EthCall {
    uint256 public value;

    constructor() payable {
        value = 5;
    }

    function getBaseFee() public view virtual returns (uint256) {
        return block.basefee;
    }

    function doARevert() public pure {
        revert("you are a failure");
    }

    function getCoinbase() public view virtual returns (uint256) {
        address cb = block.coinbase;
        return gasleft();
    }
}
