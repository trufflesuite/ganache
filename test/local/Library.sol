pragma solidity ^0.6.0;

library Library {
    function checkMsgSender() internal view returns (address) {
        address sender = msg.sender;
        return sender;
    }

    // this function should call the checkMsgSender function
    function callCheckMsgSender() external view returns (address) {
        address sender = checkMsgSender();
        return sender;
    }
}
