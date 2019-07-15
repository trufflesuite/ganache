pragma solidity ^0.5.0;

contract TransactionData {
    function () external payable {
        require(msg.data.length == 0, "msg.data.length was 0");
    }
}
