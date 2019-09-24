pragma solidity ^0.5.0;
contract Target{
    function () external payable { }//fallback function
}
contract NonZero{
    Target private theInstance;
    constructor() public{
        theInstance=new Target();
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
    function () external payable { }
}
