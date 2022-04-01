//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

library Converter
{
    function toBytes32(address addr) public pure returns(bytes32){
       return bytes32(uint256(uint160(addr)) << 96);
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }
}