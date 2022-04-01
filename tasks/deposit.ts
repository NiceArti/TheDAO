import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"

task("deposit", "Make deposit for voting to dao")
.addParam("user", "Amount of token to vote")
.addParam("amount", "Amount of token to vote")
.addParam("id", "Amount of token to vote")
.setAction(async (taskArgs, hre) => 
{
    const contract = await hre.ethers.getContractAt("TheDAO", DEPLOYED_CONTRACT);
    await contract.deposit(taskArgs.user,taskArgs.amount,taskArgs.id);
});