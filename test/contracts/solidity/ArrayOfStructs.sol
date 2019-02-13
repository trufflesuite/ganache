pragma solidity ^0.4.2;

contract ArrayOfStructs {
  struct PayRecord {
    address sender;
    uint256 sum;
    uint256 blockNumber;
    uint256 status;
  }

  event PaymentPlaced(address senderAddress, uint256 blockNumber, uint256 payIndex, string guid);

  PayRecord[] public payments;

  function payForSomething(string guid) public payable {
    uint256 newLength = payments.push(PayRecord(msg.sender, msg.value, block.number, 0));
    PaymentPlaced(msg.sender, block.number, newLength-1, guid);
  }

  function changeSomething(uint256 paymentIndex) public view {
    if (payments[paymentIndex].status == 0) {
      payments[paymentIndex].status == 1;
    }
  }
}