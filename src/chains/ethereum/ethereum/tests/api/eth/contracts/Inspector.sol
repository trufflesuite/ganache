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

    function getStoredBalance(address addr, uint256 slot) public returns (uint256) {
      address thisAddress = address(this);
      address prev;
      assembly {
         prev := sload(slot)
         sstore(slot, addr)
         // if this is the first time calling this function, the data at some
         // unknown slot can be 0, 1, or 2 because of our above declared storage
         if or(eq(prev, 0), or(eq(prev, 1), eq(prev,2))) {
          prev := thisAddress
         }
      }
      return prev.balance;
    }

    /** 
      @dev this function should touch different accounts depending on the access list
      provided by the sender. every time it is run with an accessList from the
      previous run, it can touch one more account. we cap the number of runs
      at 10. So, once an access list with the 10 accounts is sent alongside
      the transaction, the function will consistently touch the same number of
      accounts.
      COLD_ACCOUNT_ACCESS_COST is 2600 - the cost to read from an account with no access list
      WARM_STORAGE_READ_COST is 100 - the cost to read from an account with access list
    */ 
    function multiAccessList(address addr1) public view {
      uint256 counter = 0;
      bool flag = true;
      do {
        counter = counter + 1;
        uint256 startGas = gasleft();
        uint256 bal1 = addr1.balance;
        uint256 gasUsed = startGas - gasleft();
        require(bal1 >= 0, "Balance is less than 0");
        if(gasUsed < 2600) {
          uint160 temp = uint160(addr1);
          addr1 = address(temp+1);
        }
        else {
          flag = false;
        }
      }
      while (flag && counter < 10);
    }

    function send(address payable addr) payable public {
      addr.transfer(msg.value);
    }
}
