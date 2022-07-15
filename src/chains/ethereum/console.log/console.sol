// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.22 <0.9.0;

library console {
    address constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);

    function _sendLogPayload(bytes memory payload) private view {
        address consoleAddress = CONSOLE_ADDRESS;
        assembly {
            let argumentsLength := mload(payload)
            let argumentsOffset := add(payload, 32)
            pop(staticcall(gas(), consoleAddress, argumentsOffset, argumentsLength, 0, 0))
        }
    }

    function log() internal view {
        _sendLogPayload(abi.encodeWithSignature("log()"));
    }

    function logAddress(address value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address)", value));
    }

    function logBool(bool value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool)", value));
    }

    function logString(string memory value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string)", value));
    }

    function logUint256(uint256 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256)", value));
    }

    function logUint(uint256 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256)", value));
    }

    function logBytes(bytes memory value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes)", value));
    }

    function logInt256(int256 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(int256)", value));
    }

    function logInt(int256 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(int256)", value));
    }

    function logBytes1(bytes1 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes1)", value));
    }

    function logBytes2(bytes2 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes2)", value));
    }

    function logBytes3(bytes3 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes3)", value));
    }

    function logBytes4(bytes4 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes4)", value));
    }

    function logBytes5(bytes5 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes5)", value));
    }

    function logBytes6(bytes6 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes6)", value));
    }

    function logBytes7(bytes7 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes7)", value));
    }

    function logBytes8(bytes8 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes8)", value));
    }

    function logBytes9(bytes9 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes9)", value));
    }

    function logBytes10(bytes10 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes10)", value));
    }

    function logBytes11(bytes11 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes11)", value));
    }

    function logBytes12(bytes12 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes12)", value));
    }

    function logBytes13(bytes13 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes13)", value));
    }

    function logBytes14(bytes14 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes14)", value));
    }

    function logBytes15(bytes15 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes15)", value));
    }

    function logBytes16(bytes16 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes16)", value));
    }

    function logBytes17(bytes17 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes17)", value));
    }

    function logBytes18(bytes18 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes18)", value));
    }

    function logBytes19(bytes19 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes19)", value));
    }

    function logBytes20(bytes20 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes20)", value));
    }

    function logBytes21(bytes21 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes21)", value));
    }

    function logBytes22(bytes22 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes22)", value));
    }

    function logBytes23(bytes23 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes23)", value));
    }

    function logBytes24(bytes24 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes24)", value));
    }

    function logBytes25(bytes25 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes25)", value));
    }

    function logBytes26(bytes26 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes26)", value));
    }

    function logBytes27(bytes27 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes27)", value));
    }

    function logBytes28(bytes28 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes28)", value));
    }

    function logBytes29(bytes29 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes29)", value));
    }

    function logBytes30(bytes30 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes30)", value));
    }

    function logBytes31(bytes31 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes31)", value));
    }

    function logBytes32(bytes32 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bytes32)", value));
    }

    function log(address value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address)", value));
    }

    function log(bool value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool)", value));
    }

    function log(string memory value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string)", value));
    }

    function log(uint256 value) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256)", value));
    }

    function log(address value1, address value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address)", value1, value2));
    }

    function log(address value1, bool value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool)", value1, value2));
    }

    function log(address value1, string memory value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string)", value1, value2));
    }

    function log(address value1, uint256 value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256)", value1, value2));
    }

    function log(bool value1, address value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address)", value1, value2));
    }

    function log(bool value1, bool value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool)", value1, value2));
    }

    function log(bool value1, string memory value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string)", value1, value2));
    }

    function log(bool value1, uint256 value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256)", value1, value2));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address)", value1, value2));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool)", value1, value2));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string)", value1, value2));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256)", value1, value2));
    }

    function log(uint256 value1, address value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address)", value1, value2));
    }

    function log(uint256 value1, bool value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool)", value1, value2));
    }

    function log(uint256 value1, string memory value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string)", value1, value2));
    }

    function log(uint256 value1, uint256 value2) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256)", value1, value2));
    }

    function log(address value1, address value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address)", value1, value2, value3));
    }

    function log(address value1, address value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool)", value1, value2, value3));
    }

    function log(address value1, address value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string)", value1, value2, value3));
    }

    function log(address value1, address value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256)", value1, value2, value3));
    }

    function log(address value1, bool value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address)", value1, value2, value3));
    }

    function log(address value1, bool value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool)", value1, value2, value3));
    }

    function log(address value1, bool value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string)", value1, value2, value3));
    }

    function log(address value1, bool value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256)", value1, value2, value3));
    }

    function log(address value1, string memory value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address)", value1, value2, value3));
    }

    function log(address value1, string memory value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool)", value1, value2, value3));
    }

    function log(address value1, string memory value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string)", value1, value2, value3));
    }

    function log(address value1, string memory value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256)", value1, value2, value3));
    }

    function log(address value1, uint256 value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address)", value1, value2, value3));
    }

    function log(address value1, uint256 value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool)", value1, value2, value3));
    }

    function log(address value1, uint256 value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string)", value1, value2, value3));
    }

    function log(address value1, uint256 value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256)", value1, value2, value3));
    }

    function log(bool value1, address value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address)", value1, value2, value3));
    }

    function log(bool value1, address value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool)", value1, value2, value3));
    }

    function log(bool value1, address value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string)", value1, value2, value3));
    }

    function log(bool value1, address value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256)", value1, value2, value3));
    }

    function log(bool value1, bool value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address)", value1, value2, value3));
    }

    function log(bool value1, bool value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool)", value1, value2, value3));
    }

    function log(bool value1, bool value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string)", value1, value2, value3));
    }

    function log(bool value1, bool value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256)", value1, value2, value3));
    }

    function log(bool value1, string memory value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address)", value1, value2, value3));
    }

    function log(bool value1, string memory value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool)", value1, value2, value3));
    }

    function log(bool value1, string memory value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string)", value1, value2, value3));
    }

    function log(bool value1, string memory value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256)", value1, value2, value3));
    }

    function log(bool value1, uint256 value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address)", value1, value2, value3));
    }

    function log(bool value1, uint256 value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool)", value1, value2, value3));
    }

    function log(bool value1, uint256 value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string)", value1, value2, value3));
    }

    function log(bool value1, uint256 value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string)", value1, value2, value3));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256)", value1, value2, value3));
    }

    function log(uint256 value1, address value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address)", value1, value2, value3));
    }

    function log(uint256 value1, address value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool)", value1, value2, value3));
    }

    function log(uint256 value1, address value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string)", value1, value2, value3));
    }

    function log(uint256 value1, address value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256)", value1, value2, value3));
    }

    function log(uint256 value1, bool value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address)", value1, value2, value3));
    }

    function log(uint256 value1, bool value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool)", value1, value2, value3));
    }

    function log(uint256 value1, bool value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string)", value1, value2, value3));
    }

    function log(uint256 value1, bool value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256)", value1, value2, value3));
    }

    function log(uint256 value1, string memory value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address)", value1, value2, value3));
    }

    function log(uint256 value1, string memory value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool)", value1, value2, value3));
    }

    function log(uint256 value1, string memory value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string)", value1, value2, value3));
    }

    function log(uint256 value1, string memory value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256)", value1, value2, value3));
    }

    function log(uint256 value1, uint256 value2, address value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address)", value1, value2, value3));
    }

    function log(uint256 value1, uint256 value2, bool value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool)", value1, value2, value3));
    }

    function log(uint256 value1, uint256 value2, string memory value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string)", value1, value2, value3));
    }

    function log(uint256 value1, uint256 value2, uint256 value3) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256)", value1, value2, value3));
    }

    function log(address value1, address value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,address)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,bool)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,string)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,address,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,address)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,bool)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,string)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,address)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,bool)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,string)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,string,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,address)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,bool)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,string)", value1, value2, value3, value4));
    }

    function log(address value1, address value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,address,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,address)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,bool)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,string)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,address)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,bool)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,string)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,address)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,bool)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,string)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,address)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,bool)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,string)", value1, value2, value3, value4));
    }

    function log(address value1, bool value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,address)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,bool)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,string)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,address,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,address)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,bool)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,string)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,address)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,bool)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,string)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,string,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,address)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,bool)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,string)", value1, value2, value3, value4));
    }

    function log(address value1, string memory value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,string,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,address)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,bool)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,string)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,address,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,address)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,bool)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,string)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,bool,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,address)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,bool)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,string)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,string,uint256)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,address)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,bool)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,string)", value1, value2, value3, value4));
    }

    function log(address value1, uint256 value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(address,uint256,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,address)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,string)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,address)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,string)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,address)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,string)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,address)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,string)", value1, value2, value3, value4));
    }

    function log(bool value1, address value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,address)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,string)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,address)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,string)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,address)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,string)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,address)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,string)", value1, value2, value3, value4));
    }

    function log(bool value1, bool value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,address)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,string)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,address)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,string)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,address)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,string)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,address)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,string)", value1, value2, value3, value4));
    }

    function log(bool value1, string memory value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,address)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,string)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,address,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,address)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,string)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,bool,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,address)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,string)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,string,uint256)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,address)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,bool)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,string)", value1, value2, value3, value4));
    }

    function log(bool value1, uint256 value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(bool,uint256,uint256,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,address,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,string,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, address value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,address,uint256,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, bool value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint256,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,address,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,string,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, string memory value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,string,uint256,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,address,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,bool,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,string,uint256)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,address)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,bool)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,string)", value1, value2, value3, value4));
    }

    /**
    * Prints to `stdout` with newline. Multiple arguments can be passed, with the
    * first used as the primary message and all additional used as substitution
    * values similar to [`printf(3)`](http://man7.org/linux/man-pages/man3/printf.3.html) (the arguments are all passed to `util.format()`).
    *
    * ```solidity
    * uint256 count = 5;
    * console.log('count: %d', count);
    * // Prints: count: 5, to stdout
    * console.log('count:', count);
    * // Prints: count: 5, to stdout
    * ```
    *
    * See `util.format()` for more information.
    */
    function log(string memory value1, uint256 value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(string,uint256,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,address,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,bool,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,string,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, address value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,address,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,address,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,bool,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,string,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, bool value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,bool,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,address,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,bool,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,string,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, string memory value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,string,uint256,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, address value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, address value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, address value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, address value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,address,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, bool value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, bool value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, bool value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, bool value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,bool,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, string memory value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, string memory value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, string memory value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, string memory value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,string,uint256)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, uint256 value3, address value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,address)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, uint256 value3, bool value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,bool)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, uint256 value3, string memory value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,string)", value1, value2, value3, value4));
    }

    function log(uint256 value1, uint256 value2, uint256 value3, uint256 value4) internal view {
        _sendLogPayload(abi.encodeWithSignature("log(uint256,uint256,uint256,uint256)", value1, value2, value3, value4));
    }
}