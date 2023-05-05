// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
contract Target {
    fallback () external payable { }
}
contract NonZero {
    Target private theInstance;
    constructor() public {
        theInstance = new Target();
    }
    function doCall() external payable {
        address(theInstance).call{value:msg.value, gas: 123456}("");
    }
    function doTransfer() external payable {
        payable(theInstance).transfer(msg.value);
    }
    function doSend() external payable {
        payable(theInstance).send(msg.value);
    }
}