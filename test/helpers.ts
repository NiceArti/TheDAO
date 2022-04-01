import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { TheDAO, Token } from "../typechain";


export async function createToken()
{
    const Token = await ethers.getContractFactory("Token")
    let token: Token = await Token.deploy()
    await token.deployed()

    return token;
}

export async function createDAO(
    token: string,
    account: string,
    quorum: number,
    days: number
) {
    const ConverterLib = await ethers.getContractFactory("Converter")
    let library = await ConverterLib.deploy();
    await library.deployed();

    const TheDAO = await ethers.getContractFactory("TheDAO", 
    {
        libraries: {
            Converter: library.address,
        }
    })
    /// @dev: 86400 - days in seconds
    let daysInSeconds = days * 86400
    let dao: TheDAO = await TheDAO.deploy(token, account, parseUnits(`${quorum}`), daysInSeconds)
    await dao.deployed()

    return dao;
}

export async function abiEncoded(from: string, to: string, amount: number) 
{
    const abi = "function transferFrom(address from, address to, uint256 amount) public returns (bool)"
    const iface = new ethers.utils.Interface([abi]);

    return iface.encodeFunctionData("transferFrom", [from, to, amount]);
}

export function secondsToDays(seconds: number)
{
    let currentTime = Date.now() / 1000
    let fixed: any = ((seconds - currentTime) / 86400).toFixed()
    return parseInt(fixed);
}

export async function skip(time: number, current: any = Date.now()) {
    current /= 1000
    current = parseInt(current)
    await ethers.provider.send("evm_increaseTime", [current += time]);
    await ethers.provider.send('evm_mine', [current += time]);
}