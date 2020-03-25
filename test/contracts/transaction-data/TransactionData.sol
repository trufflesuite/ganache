pragma solidity ^0.6.0;

contract TransactionData {
    fallback () external payable {
        require(msg.data.length == 0, "msg.data.length was 0");
    }
}
