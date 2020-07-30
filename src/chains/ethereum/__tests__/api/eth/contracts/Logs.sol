pragma solidity ^0.6.1;

contract Logs {
  event Event(uint indexed first, uint indexed second);
  constructor() public {
    emit Event(1, 2);
  }

  function logNTimes (uint8 n) public {
    for (uint8 i = 0; i < n; i++){
      emit Event(i, i);
    }
  }
}
