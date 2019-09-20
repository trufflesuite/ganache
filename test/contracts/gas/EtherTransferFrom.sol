pragma solidity >=0.4.0 <0.6.0;
contract EtherTransferTo{
    function () external payable { //fallback function

    }
    function getBalance() public view returns(uint){
        return address(this).balance;
    }
}
contract EtherTransferFrom{
    EtherTransferTo private theInstance;
    constructor() public{
        //the_instance=Ether_Transfer_To(address(this));
        theInstance = new EtherTransferTo();
    }
    function getBalance() public view returns(uint){
        return address(this).balance;
    }
    function getBalanceOfInstance() public view returns(uint){
        //return address(the_instance).balance;
        return theInstance.getBalance();
    }
    function () external payable {
        // msg.sender.send(msg.value)
        // address(the_instance).send(msg.value);
        address(theInstance).transfer(msg.value);
    }
}
