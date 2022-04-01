import { task, types } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import {DEPLOYED_CONTRACT} from "./helpers"


task("add-proposal", "adds new proposal")
.addParam("description", "purpose of DAO")
.setAction(async function (taskArguments, hre) {
    const contract = await hre.ethers.getContractAt("TheDAO", DEPLOYED_CONTRACT);
    const recipient = "0x3Be9De2E8cF39BC661181E21406a7eE265f3C06d"
    const abi = "function transferFrom(address from, address to, uint256 amount) public returns (bool)"
    const iface = new hre.ethers.utils.Interface([abi]);

    const calldata = iface.encodeFunctionData("transferFrom", [
        recipient,
        DEPLOYED_CONTRACT,
        10
    ]);

    let transactionResponse = await contract.addProposal(
        taskArguments.description,
        calldata,
        taskArguments.recipient,
        {gasLimit: 500_000}
    )

    // const transactionResponse = await contract.redeem(INIT, {gasLimit: 500_000});
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});