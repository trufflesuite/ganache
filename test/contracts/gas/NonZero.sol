pragma solidity ^0.6.0;
contract Target {
    fallback () external payable { }
}
contract NonZero {
    Target private theInstance;
    constructor() public {
        theInstance = new Target();
    }
    function doCall() external payable {
        address(theInstance).call.value(msg.value).gas(123456)("");
    }
    function doTransfer() external payable {
        address(theInstance).transfer(msg.value);
    }
    function doSend() external payable {
        address(theInstance).send(msg.value);
    }
}
