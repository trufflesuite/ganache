// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Create {
    function create() public returns (address addr) {
        bytes memory code = randomBytes(49153); // just large enough to trigger EIP-3860
        bytes1 exit = bytes1(uint8(0x0));
        bytes1 invalid = bytes1(uint8(0xfe));
        code[0] = exit;
        code[49152] = invalid;
        assembly {
            addr := create(0, add(code, 0x20), mload(code))
        }
        // make sure addr is not the zero address:
        // if EIP-3860 is triggered, the contract will not be created and addr will be the zero address
        require(addr != address(0), "Create: failed to create contract");
    }

    function concatenate(
        bytes memory x,
        bytes32 y
    ) public pure returns (bytes memory) {
        return abi.encodePacked(x, y);
    }

    function random32(uint256 counter) public view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.difficulty,
                    msg.sender,
                    counter
                )
            );
    }

    function randomBytes(uint256 length) public view returns (bytes memory) {
        bytes memory randomBytes = new bytes(49153);
        // for (uint256 i = 0; i < length; i += 32) {
        //     randomBytes = concatenate(randomBytes, random32(i));
        // }
        return randomBytes;
    }
}
