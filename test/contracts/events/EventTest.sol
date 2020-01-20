pragma solidity ^0.6.0;
contract EventTest {
  event ExampleEvent(uint indexed first, uint indexed second);

  function triggerEvent(uint _first, uint _second) public {
    emit ExampleEvent(_first, _second);
  }
}
