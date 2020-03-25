pragma solidity ^0.6.0;

contract Test2 {
  // Just make sure there really is some code here
  uint256 foo;
  function test() external {
    foo = 1337;
  }
}

contract IntraBlockCache {
  function deploy() external {
    Test2 x = new Test2();
    address addr = address(x);
    uint32 size;
    assembly { size := extcodesize(addr) }
    require(size > 0, 'extcodesize is broken');
  }
}
