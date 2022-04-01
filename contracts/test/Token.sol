//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20
{
    mapping(address => uint256) timeToFaucet;

    constructor() ERC20("Test", "TST")
    {
        _mint(msg.sender, 1000000000 * 10**18);
    }


    /// @notice function can be called only once per hour
    /// @dev sends 100 tokens to balance of sender
    function faucet() external{
        uint256 time = block.timestamp;
        require(time >= timeToFaucet[msg.sender]);

        timeToFaucet[msg.sender] = time + 3600;
        _mint(msg.sender, 100 * 10**18);
    }

}