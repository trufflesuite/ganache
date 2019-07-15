pragma solidity ^0.5.0;

// From https://github.com/ethereumjs/testrpc/issues/58
contract EstimateGas {
    event Add(bytes32 name, bytes32 description, uint value, address owner);

    struct Test {
        bytes32 name;
        bytes32 description;
        uint[] balances;
        mapping(address => uint) owners;
    }

    uint256 public x;
    uint256 public y;
    function reset() public {
        x = 0;
        y = 1;
    }
    function initialSettingOfX() public {
        x = 1;
    }
    function triggerRsclearRefund() public {
        x = gasleft();
        reset();
    }
    function triggerRsclearRefundForX() public {
        reset();
        x = gasleft();
    }
    function triggerRsclearRefundForY() public {
        y = gasleft();
        reset();
    }
    function triggerRselfdestructRefund() public {
        selfdestruct(msg.sender);
    }
    function triggerAllRefunds() public {
        triggerRsclearRefund();
        triggerRselfdestructRefund();
    }

    
    // https://github.com/trufflesuite/ganache-cli/issues/294
    mapping (uint => uint) public uints;
    // Sets the uints[1] slot to a value;
    function store(uint _uint) public { uints[1] = _uint;}
    function clear() public { delete uints[1]; }

    mapping(bytes32 => uint) index;
    Test[] tests;

    constructor() public {
        tests.length++;
    }

    function add(bytes32 _name, bytes32 _description, uint _value) public returns(bool) {
        if (index[_name] != 0) {
            return false;
        }
        uint pos = tests.length++;
        tests[pos].name = _name;
        tests[pos].description = _description;
        tests[pos].balances.length = 2;
        tests[pos].balances[1] = _value;
        tests[pos].owners[msg.sender] = 1;
        index[_name] = pos;
        emit Add(_name, _description, _value, msg.sender);
        return true;
    }

    function transfer(address _to, uint _value, bytes32 _name) public returns(bool) {
        uint pos = index[_name];
        if (pos == 0) {
            return false;
        }

        uint posFrom = tests[pos].owners[msg.sender];
        if (posFrom == 0) {
            return false;
        }

        if (tests[pos].balances[posFrom] < _value) {
            return false;
        }

        uint posTo = tests[pos].owners[_to];
        if (posTo == 0) {
            uint posBal = tests[pos].balances.length++;
            tests[pos].owners[_to] = posBal;
            posTo = posBal;
        }

        if (tests[pos].balances[posTo] + _value < tests[pos].balances[posTo]) {
            return false;
        }
        tests[pos].balances[posFrom] -= _value;
        tests[pos].balances[posTo] += _value;

        return true;
    }

    function currentBlock() public returns (uint) {
        return block.number;
    }
}
