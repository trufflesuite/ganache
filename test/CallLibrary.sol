pragma solidity ^0.4.24;

import "./Library.sol";

contract CallLibrary {
    address originalSender = msg.sender;
    event ProxyDeposit(uint length, uint256 value);

    // snagged this from Aragon
    using Library for bytes32;
    bytes32 internal constant DEPOSITABLE_POSITION = 0x665fd576fbbe6f247aff98f5c94a561e3f71ec2d3c988d56f12d342396c50cea;

    function callExternalLibraryFunction() public view returns (bool) {
        address sender = Library.callCheckMsgSender();
        if (sender == originalSender){
            return true;
        }
        return false;
    }

    function callGetStorageBool() public view returns (bool) {
        return DEPOSITABLE_POSITION.getStorageBool(); 
    }

    function callCheckMsgData() public view returns (uint256) {
        bytes memory data = Library.checkMsgData();
        return data.length;
    }

    function () external payable {
        require(msg.value > 0 && msg.data.length == 0);
        emit ProxyDeposit(msg.data.length, msg.value);
    }
}