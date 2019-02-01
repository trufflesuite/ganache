pragma solidity ^0.4.2;

import "./DebugContract.sol";

contract DebugContractStorage {
    DebugContract debugContract;

    constructor() public {
        debugContract = new DebugContract();
    }

    function set() public {
        debugContract.setValue(1);
        debugContract.setValue(2);
    }
}
