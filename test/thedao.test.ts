import { expect } from "chai"
import { parseUnits } from "ethers/lib/utils"
import { ethers } from "hardhat"
import { BytesLike, constants, utils } from "ethers";
import { TheDAO, Token } from "../typechain";
import * as helper from "./helpers"
import { stat } from "fs";


describe("TheDAO", function () {
  const ZERO_ADDRESS: string = '0x0000000000000000000000000000000000000000'
  let owner: any, acc1: any
  let token: Token
  let instance: any

  const FOUR_DAYS = 4 * 3600 * 24

  let timeskip: any = Date.now() / 1000
  timeskip = parseInt(timeskip)

  beforeEach(async () => 
  {
    // create accounts
    [owner, acc1] = await ethers.getSigners()
    
    // create token
    token = await helper.createToken()
    instance = await helper.createDAO(token.address, owner.address, 200, 3)
  });


  describe("addProposal", () => 
  {
    it("addProposal: Should initialize all proposal data", async () => 
    {
      const callData = helper.abiEncoded(owner.address, instance.address, 20)
      await instance.addProposal("Should we sell tokens?", callData, owner.address)
      
      let stats = await instance.proposalStatistics(1)

      expect(helper.secondsToDays(stats.endTime)).to.be.eq(3)
      expect(stats.status).to.be.eq(1)
    })

    it("addProposal: Should fail if recipient is address zero", async () => 
    {
      const callData = helper.abiEncoded(owner.address, instance.address, 20)
      expect(instance.addProposal("Should we sell tokens?", callData, ZERO_ADDRESS))
      .to.be.revertedWith("TheDAO: recipient cannot be zero address")
    })
  })

  describe("deposit", () => 
  {
    beforeEach(async () => 
    {
      const callData = helper.abiEncoded(owner.address, instance.address, 20)
      await instance.addProposal("Should we sell tokens?", callData, owner.address)
      await token.transfer(acc1.address, 20)
      await token.connect(acc1).approve(instance.address, 20)
      await token.approve(instance.address, 20)
    })


    it("deposit: Should deposit token to make vote", async () => 
    {
      await instance.connect(acc1).deposit(acc1.address, 20, 1)
      let info = await instance.connect(acc1).voterInfo(acc1.address)
      expect(info.amount).to.be.eq(20)
    })

    it("deposit: Should fail if proposal is not created", async () => 
    {
      expect(instance.deposit(owner.address, 20, 2))
      .to.be.revertedWith("TheDAO: proposal must be started")
    })

    it("deposit: Should fail if amount is zero", async () => 
    {
      expect(instance.deposit(owner.address, 0, 2))
      .to.be.revertedWith("TheDAO: amount cannot be zero")
    })
  })

  describe("addVote", () => 
  {
    beforeEach(async () => 
    {
      const callData = helper.abiEncoded(owner.address, instance.address, 20)
      await instance.addProposal("Should we sell tokens?", callData, owner.address)
      await token.approve(instance.address, 20)
      await instance.deposit(owner.address, 20, 1)
      await token.transfer(acc1.address, 20)
      await token.connect(acc1).approve(instance.address, 20)
    })

    it("addVote: Should add one pro vote and one contra", async () => 
    {
      await instance.addVote(1, true)
      await instance.connect(acc1).deposit(acc1.address, 20, 1)
      await instance.connect(acc1).addVote(1, false)

      let status = await instance.proposalStatistics(1)
      expect(status.votesPro).to.be.eq(1)
      expect(status.votesContra).to.be.eq(1)
    })

    it("addVote: Should not change state of votes after time ended", async () => 
    {
      await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
      await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);
      await instance.addVote(1, true)

      let stats = await instance.proposalStatistics(1)
      expect(stats.votesPro).to.be.eq(0)
      expect(stats.votesContra).to.be.eq(0)
    })

    it("addVote: Should not change timelock period if votes twice for one proposal", async () => 
    {
      await instance.addVote(1, true)

      let stats = await instance.proposalStatistics(1)
      let timelockBefore = stats.votesPro
      let votesCountBefore = stats.endTime
      let amountBefore = stats.votesAmount
      
      await token.approve(instance.address, 20)
      await instance.deposit(owner.address, 20, 1)
      await instance.addVote(1, true)

      stats = await instance.proposalStatistics(1)
      let timelockAfter = stats.votesPro
      let votesCountAfter = stats.endTime
      let amountAfter = stats.votesAmount

      expect(timelockBefore).to.be.eq(timelockAfter)
      expect(votesCountBefore).to.be.eq(votesCountAfter)
      expect(amountBefore.add(20)).to.be.eq(amountAfter)
    })

    it("addVote: Should fail if vote amount is zero", async () => 
    {
      expect(instance.addVote(1, true)).to.be.revertedWith("TheDAO: deposit first")
    })
  })

  
  describe("finishProposal", () => 
  {
    beforeEach(async () => 
    {
      const callData = helper.abiEncoded(owner.address, instance.address, 20)
      await instance.addProposal("Should we sell tokens?", callData, owner.address)
      await token.approve(instance.address, 20)
      await instance.deposit(owner.address, 20, 1)
      await token.transfer(acc1.address, 20)
      await token.connect(acc1).approve(instance.address, 20)
      await instance.addVote(1, true)
    })

    it("finishProposal: Should update status of proposal to finished. UNSUCCESS", async () => 
    {
      await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
      await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);
      await instance.connect(acc1).finishProposal(1)

      let stats = await instance.proposalStatistics(1)
      
      expect(stats.result).to.be.eq(2)
      expect(stats.status).to.be.eq(2)
      expect(stats.votesPro).to.be.eq(0)
      expect(stats.votesContra).to.be.eq(0)
    })

    it("finishProposal: Should update status of proposal to finished. SUCCESS", async () => 
    {
      await token.approve(instance.address, parseUnits("200"))
      await instance.deposit(owner.address, parseUnits("200"), 1)
      await instance.addVote(1, true)
      await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS]);
      await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS]);
      await instance.connect(acc1).finishProposal(1)

      let stats = await instance.proposalStatistics(1)
      
      expect(stats.result).to.be.eq(1)
      expect(stats.status).to.be.eq(2)

      if(stats.votesPro > stats.votesContra)
        console.log("Votes pro wins")
      else
        console.log("Votes contra wins")
    })

    it("finishProposal: Should fail if finish before end time", async () => 
    {
      expect(instance.finishProposal(1))
      .to.be.revertedWith("TheDAO: proposal has not been ended yet")
    })

    it("finishProposal: Should fail if vote status is not started", async () => 
    {
      expect(instance.finishProposal(2))
      .to.be.revertedWith("TheDAO: this proposal must be started")
    })
  })

  describe("withdraw", () => 
  {
    beforeEach(async () => 
    {
      await token.transfer(acc1.address, 20)
      const callData = helper.abiEncoded(owner.address, instance.address, 20)
      await instance.addProposal("Should we sell tokens?", callData, owner.address)
      await token.approve(instance.address, 20)
      await instance.deposit(owner.address, 20, 1)
      await instance.addVote(1, true)

      await ethers.provider.send('evm_increaseTime', [timeskip += FOUR_DAYS])
      await ethers.provider.send('evm_mine', [timeskip += FOUR_DAYS])
      await instance.finishProposal(1)
    })

    it("withdraw: Should transfer tokens to recipient after votings done", async () => 
    {
      let balanceBefore = await token.balanceOf(owner.address)
      await instance.withdraw(owner.address)
      let balanceAfter = await token.balanceOf(owner.address)
      expect(balanceBefore.add(20)).to.be.eq(balanceAfter)
    })

    it("withdraw: Should fail if try to withdraw before timelock ends", async () => 
    {
      expect(instance.withdraw(1))
      .to.be.revertedWith("TheDAO: user's funds are still locked")
    })


    it("withdraw: Should fail if user hadn't deposit yet", async () => 
    {
      expect(instance.connect(acc1).withdraw(1))
      .to.be.revertedWith("TheDAO: account has not been deposited yet")
    })

    it("withdraw: Should fail if amount is zero", async () => 
    {
      expect(instance.withdraw(1))
      .to.be.revertedWith("TheDAO: user's funds are still locked yet")
    })

    it("withdraw: Should fail if zero address", async () => 
    {
      expect(instance.withdraw(1))
      .to.be.revertedWith("TheDAO: account cannot be zero")
    })
  })

  describe("withdraw", () => 
  {
    beforeEach(async () => 
    {
      await token.transfer(acc1.address, 20)
      const callData = helper.abiEncoded(owner.address, instance.address, 20)
      await instance.addProposal("Should we sell tokens?", callData, owner.address)
      await token.connect(acc1).approve(instance.address, 20)
    })

    it("withdraw: Should transfer tokens to recipient if he/she didn't vote yet", async () => 
    { 
      await instance.connect(acc1).deposit(acc1.address, 20, 1)
      let balanceBefore = await token.balanceOf(acc1.address)

      await instance.connect(acc1).withdraw(acc1.address)
      let balanceAfter = await token.balanceOf(acc1.address)
      expect(balanceBefore.add(20)).to.be.eq(balanceAfter)
    })
  })

});
