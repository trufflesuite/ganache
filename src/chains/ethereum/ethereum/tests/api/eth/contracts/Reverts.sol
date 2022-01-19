// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Reverts {
    function invalidRevertReason() public pure {
        assembly {
            // revert reason code
            mstore(0x80, 0x0000000000000000000000000000000000000000000000000000000008c379a0)
            // invalid data
            mstore(0xA0, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc0)
            // trigger revert, returning the mstore values set above
            revert(
                0x9C, /* mem start */
                0x24 /* mem length */
            )
        }
    }
}
