import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"

task("finish-proposal", "Make deposit for voting to dao")
.addParam("id", "Id of finished proposal")
.setAction(async (taskArgs, hre) => 
{
    const contract = await hre.ethers.getContractAt("TheDAO", DEPLOYED_CONTRACT);
    await contract.finishProposal(taskArgs.id);
});