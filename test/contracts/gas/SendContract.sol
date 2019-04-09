// FROM: https://github.com/trufflesuite/ganache-cli/issues/585
pragma solidity ^0.4.13;
contract SendContract {
    function Send() public payable{

    }

    function () public payable{
    }

    function getBalance() public view returns (uint balance){
        balance = this.balance;
        return balance;
    }

    function transfer(address[] receiver, uint256 amount) payable public returns(bool){
        for(uint i = 0; i < receiver.length; i++){
            receiver[i].transfer(amount);
        }
        return true;
    }   
}
