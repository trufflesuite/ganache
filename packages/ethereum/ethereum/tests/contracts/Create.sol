// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Create {
    function create() public returns (address addr) {
        bytes memory code = new bytes(49153); // just large enough to trigger EIP-3860
        bytes1 exit = bytes1(uint8(0x0));
        bytes1 invalid = bytes1(uint8(0xfe));
        code[0] = exit;
        code[49152] = invalid;
        assembly {
            addr := create(0, add(code, 0x20), mload(code))
        }
        // make sure addr is not the zero address:
        // if EIP-3860 is triggered, the contract will not be created and addr will be the zero address
        assert(addr != address(0));
    }
}
