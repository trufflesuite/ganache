pragma solidity ^0.4.2;

contract TransactionData {
    function () external payable {
        require(msg.data.length == 0, "msg.data.length was 0");
    }
}