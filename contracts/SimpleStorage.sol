pragma solidity ^0.4.24;

contract SimpleStorage {
    uint variable;

    function set(uint value) public {
        variable = value;
    }

    function get() public view returns(uint) {
        return variable;
    }
}
