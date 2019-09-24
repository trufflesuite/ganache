pragma solidity ^0.5.0;
contract NonZero{
        function () external payable {
        // address(msg.sender).send(msg.value);
        // address(msg.sender).transfer(msg.value);
        address(msg.sender).call.value(msg.value).gas(123456)("");
    }
}
