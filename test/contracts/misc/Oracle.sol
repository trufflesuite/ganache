pragma solidity ^0.6.0;

contract Oracle{
  bytes32 public blockhash0;
  uint public lastBlock;
  constructor() public {
    blockhash0 = blockhash(0);
  }
  function currentBlock() public view returns (uint) {
    return block.number;
  }
  function setCurrentBlock() public {
    lastBlock = block.number;
  }
}
