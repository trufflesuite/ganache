pragma solidity ^0.5.0;

contract Revert {
  uint public value;

  event ValueSet(uint);

  function alwaysReverts(uint val) public {
    value = val;
    emit ValueSet(val);
    revert();
  }
}
