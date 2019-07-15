pragma solidity ^0.5.0;

import "./DebugContract.sol";

contract DebugContractStorage {
    DebugContract debugContract = new DebugContract();

    function set() public {
        debugContract.setValue(1);
        debugContract.setValue(2);
    }

    function getValue() public view returns(uint) {
        return debugContract.get();
    }

    function getOtherValue() public view returns(uint) {
        return debugContract.getOther();
    }
}
