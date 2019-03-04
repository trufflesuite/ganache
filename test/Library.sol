pragma solidity ^0.4.24;

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

    function getStorageBool(bytes32 position) internal view returns (bool data) {
        assembly { data := sload(position) }
    }

    function checkMsgData() internal view returns (bytes memory) {
        bytes memory data = msg.data;
        return data;
    }
}