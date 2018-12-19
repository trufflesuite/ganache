pragma solidity ^0.4.2;

contract Example {
  uint public value;

  event ValueSet(uint);

  function Example() payable {
    value = 5;
  }

  function setValue(uint val) {
    value = val;
    ValueSet(val);
  }
}
