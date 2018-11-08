pragma solidity ^0.4.24;

import "./Library.sol";

contract CallLibrary {
    function callExternalLibraryFunction() public view returns (address) {
        address sender = Library.callCheckMsgSender();
        return sender;
    }
}