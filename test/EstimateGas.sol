pragma solidity ^0.4.2;

// From https://github.com/ethereumjs/testrpc/issues/58
contract EstimateGas {
    event Add(bytes32 name, bytes32 description, uint value, address owner);

    struct Test {
        bytes32 name;
        bytes32 description;
        uint[] balances;
        mapping(address => uint) owners;
    }

    mapping(bytes32 => uint) index;
    Test[] tests;
    string field;

    function EstimateGas() {
        tests.length++;
    }

    function add(bytes32 _name, bytes32 _description, uint _value) returns(bool) {
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
        Add(_name, _description, _value, msg.sender);
        return true;
    }

    function transfer(address _to, uint _value, bytes32 _name) returns(bool) {
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

	function setField(string value) {
	    // This check will screw gas estimation! Good, good!
   	    if (msg.gas < 100000) {
		    throw;
	    }
	    field = value;
    }
}
