// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma experimental ABIEncoderV2;

  
contract Inspector {
  uint256 public val1 = 1; 
  uint256 public val2 = 2; 

    function getBalance(address addr)
        public
        view
        returns (uint256)
    {
        return addr.balance;
    }

    function getCode(address addr)
        public
        view
        returns (bytes memory code)
    {
        assembly {
            // retrieve the size of the code, this needs assembly
            let size := extcodesize(addr)
            // allocate output byte array - this could also be done without assembly
            // by using o_code = new bytes(size)
            code := mload(0x40)
            // new "memory end" including padding
            mstore(0x40, add(code, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            // store length in memory
            mstore(code, size)
            // actually retrieve the code, this needs assembly
            extcodecopy(addr, add(code, 0x20), 0, size)
        }
    }

    function getStorageAt(uint256 slot) public view returns (uint256 result) {
      assembly {
        result := sload(slot)
      }
    }    
    
    function setStorageAt(uint256 slot, uint256 value) public returns (uint256 result) {
      assembly {
        sstore(slot, value)
        result := sload(slot)
      }
    }

    function createContract(bytes memory bytecode) public returns (address contractAddr) {
      assembly {
        contractAddr := create(0, add(bytecode, 0x20), mload(bytecode))
      }
    }
}
