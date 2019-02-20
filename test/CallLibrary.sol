pragma solidity ^0.4.24;

import "./Library.sol";

contract CallLibrary {
    address originalSender = msg.sender;

    function callExternalLibraryFunction() public view returns (bool) {
        address sender = Library.callCheckMsgSender();
        if (sender == originalSender){
            return true;
        }
        return false;
    }
}