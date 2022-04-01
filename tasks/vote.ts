import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"

task("vote", "Make deposit for voting to dao")
.addParam("id", "Id of proposal")
.addParam("supportsAgainst", "Vote for or against proposal")
.setAction(async (taskArgs, hre) => 
{
    const contract = await hre.ethers.getContractAt("TheDAO", DEPLOYED_CONTRACT);
    await contract.addVote(taskArgs.id, taskArgs.supportsAgainst);
});