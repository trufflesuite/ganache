pragma solidity ^0.4.2;

contract TransactionData {
    function () external payable {
        require(msg.value > 0 && msg.data.length == 0);
    }
}