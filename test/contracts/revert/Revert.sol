pragma solidity ^0.6.0;

contract Revert {
  uint public value;

  event ValueSet(uint);

  function alwaysReverts(uint val) public {
    value = val;
    emit ValueSet(val);
    revert();
  }
}
