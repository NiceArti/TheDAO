//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./ITheDAO.sol";
import "./utils/Converter.sol";


contract TheDAO is ITheDAO, Ownable, ReentrancyGuard
{
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    enum Status {NOT_STARTED, STARTED, FINISHED}
    enum Result {PENDING, SUCCESS, UNSUCCESS}
    struct Proposal 
    {
        uint256 votesPro;
        uint256 votesContra;
        uint256 votes;
        uint256 votesAmount;
        uint256 endTime;
        bytes32 description;
        address recipient;
        bytes signature;
        Status status;
        Result result;
    }

    struct Voter 
    {
        uint256 amount;
        uint256 newAmount;
        uint256 timelock;
        mapping(uint256 => bool) deposited;
    }

    address public immutable override VOTE_TOKEN;
    address public immutable override CHAIR_PERSON;

    uint256 public immutable override MINIMUM_QUORUM;
    uint256 public immutable override DURATION;

    Counters.Counter public proposalCounter;

    mapping(address => Voter) public voterInfo;
    mapping(uint256 => Proposal) public proposalStatistics;
    

    event ProposalAdded(address creator, address account, uint256 id);

    constructor(
        address token,
        address chairPerson,
        uint256 quorum,
        uint256 duration) 
    {
        VOTE_TOKEN = token;
        CHAIR_PERSON = chairPerson;
        MINIMUM_QUORUM = quorum;
        DURATION = duration;
    }


    function addProposal(
        string memory description,
        bytes memory calldata_,
        address recipient
    ) external override
    {
        require(recipient != address(0), "TheDAO: recipient cannot be zero address");

        proposalCounter.increment();
        uint256 currentId = proposalCounter.current();
        uint256 endTime = block.timestamp + DURATION;
        Proposal storage proposal = proposalStatistics[currentId];

        proposal.status = Status.STARTED;
        proposal.signature = calldata_;
        proposal.description = Converter.stringToBytes32(description);
        proposal.endTime = endTime;

        emit ProposalAdded(msg.sender, recipient, currentId);
    }


    function deposit(
        address user,
        uint256 amount,
        uint256 proposalId
    ) external nonReentrant override
    {
        require(amount > 0, "TheDAO: amount cannot be zero");
        require(proposalStatistics[proposalId].status == Status.STARTED, "TheDAO: proposal must be started");

        IERC20(VOTE_TOKEN).safeTransferFrom(user, address(this), amount);
        voterInfo[msg.sender].amount += amount;
        voterInfo[msg.sender].newAmount = amount;
    }


    function addVote(
        uint256 proposalId,
        bool supportAgainst
    ) external nonReentrant override
    {
        Voter storage info = voterInfo[msg.sender];
        require(info.newAmount > 0, "TheDAO: deposit first");
        
        Proposal storage proposal = proposalStatistics[proposalId];

        // Leave function with message if proposal time is ended
        uint256 currentTime = block.timestamp;
        
        if (proposal.endTime < currentTime)
        {
            _finishProposal(proposalId);
            return ;
        }

        proposal.votesAmount += info.newAmount;

        // Increase time only if voter make vote
        // for first time in this proposal.
        // Votes count should not change
        if(info.deposited[proposalId] == false) {
            info.timelock += proposal.endTime;
            info.deposited[proposalId] = true;
        } else {
            return ;
        }
        
        // add vote pro/contra depends of boolean state
        supportAgainst == true 
            ? proposal.votesPro += 1
            : proposal.votesContra += 1;
    }

    function finishProposal(uint256 proposalId) external override
    {
        Proposal storage proposal = proposalStatistics[proposalId];
        require(proposal.status == Status.STARTED, "TheDAO: this proposal must be started");
        require(proposal.endTime < block.timestamp, "TheDAO: proposal has not been ended yet");
        
        _finishProposal(proposalId);
    }

    function withdraw(address account) external nonReentrant override
    {
        require(account != address(0), "TheDAO: account cannot be zero");
        Voter storage info = voterInfo[account];
        require(info.amount > 0, "TheDAO: account has not been deposited yet");
        require(info.timelock < block.timestamp, "TheDAO: user's funds are still locked");

        IERC20(VOTE_TOKEN).safeTransfer(account, info.amount);
        info.amount = info.newAmount = 0;
    }



    function _finishProposal(uint256 proposalId) internal virtual
    {
        Proposal storage proposal = proposalStatistics[proposalId];
        proposal.status = Status.FINISHED;

        (bool callStatus, ) = proposal.recipient.call(proposal.signature);
        require(callStatus == true, "TheDAO: calldata is wrong");

        if(MINIMUM_QUORUM > proposal.votesAmount)
        {
            proposal.result = Result.UNSUCCESS;
            proposal.votesPro = proposal.votesContra = 0;
            return ;
        }

        proposal.votesAmount = 0;
        proposal.result = Result.SUCCESS;
    }
}
