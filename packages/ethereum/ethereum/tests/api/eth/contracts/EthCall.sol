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

    function accessCoinBase() public view virtual returns (uint256) {
        uint256 balance = address(block.coinbase).balance;
        require(balance != 0, "coinbase balance is not zero");
        return gasleft();
    }
}
