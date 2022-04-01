//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITheDAO
{
    function DURATION() external view returns(uint256);
    function MINIMUM_QUORUM() external view returns(uint256);
    function CHAIR_PERSON() external view returns(address);
    function VOTE_TOKEN() external view returns(address);

    function addProposal(string memory description, bytes memory calldata_, address recipient) external;
    function deposit(address user, uint256 amount, uint256 proposalId) external;
    function addVote(uint256 proposalId, bool supportAgainst) external;
    function finishProposal(uint256 proposalId) external;
    function withdraw(address account) external;
}