// FROM: https://github.com/trufflesuite/ganache-cli/issues/585
pragma solidity ^0.6.0;
contract SendContract {
    function Send() public payable{

    }

    fallback () external payable{
    }

    function getBalance() public view returns (uint balance){
        balance = address(this).balance;
        return balance;
    }

    function transfer(address payable[] memory receiver, uint256 amount) public payable returns(bool){
        for(uint i = 0; i < receiver.length; i++){
            receiver[i].transfer(amount);
        }
        return true;
    }
}
