pragma solidity ^0.6.0;

contract ChainId {
  function getChainId() pure external returns (uint256) {
    uint256 id;
    assembly {
      id := chainid()
    }
    return id;
  }
}
