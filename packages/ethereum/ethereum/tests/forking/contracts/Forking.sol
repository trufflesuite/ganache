// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Forking {
  // These top level `value*` variables are useful for testing state over time
  // in the context of forking, as well as gas costs.
  //  * The local chain needs to fetch the value from the main chain
  //    if it doesn't yet have that value stored locally. This get complicated
  //    because the EVM treats 0 as "delete me!"; so we need to ensure that when 
  //    a value is set to `0` _locally_, we don't refetch it from the main
  //     chain.
  //  * Gas costs get complicated because setting a value to 0 or back to it's
  //    initial value cost a different amount than if it is set to non-0 or to a
  //    new value (depending on the active hardfork!).
  // 
  // Simple values, i.e., not structs, mappings, etc, are stored consecutively
  // starting at position 0. So `value0` can be referenced by storage location
  // `0x0`.

  // initial value is already 0, not touched by constructor
  uint public value0 = 0;

  // initial value is 1, set to 2 in constructor
  uint public value1 = 1;

  // initial value is 1, not touched by constructor
  uint public value2 = 1;

  // initial value is 1, set to 0 in constructor
  uint public value3 = 1;

  // initial value is 0, set to 1 in constructor
  uint public value4 = 0;

  constructor() payable {
    value1 = 2;
    value3 = 0;
    value4 = 1;
  }

  // sets the given value to the specified value
  function setValueFor(uint8 valuePosition, uint value) public {
    assembly {
      // trigger an sstore
      sstore(valuePosition, value)
    }
  }

  // resets the specified value to 0 before setting it to the given value
  function resetValueThenSetFor(uint8 valuePosition, uint value) public returns (uint newValue) {
    setValueFor(valuePosition, 0);
    setValueFor(valuePosition, value);

    assembly {
      // trigger an sload and assign it to our output value
      newValue := sload(valuePosition)
    }
  }

  // self destructs the contract
  function destruct() public {
    selfdestruct(payable(address(msg.sender)));
  }

  function getChainId() public view returns (uint256 chainId) {
    assembly {
      chainId := chainid()
    }
  }
}