pragma solidity ^0.4.18;

contract Revert {
  uint public value;

  event ValueSet(uint);

  function alwaysReverts(uint val) public {
    value = val;
    ValueSet(val);
    revert();
  }
}
