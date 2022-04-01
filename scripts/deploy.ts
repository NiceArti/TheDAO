import { parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

async function main() {
  const ConverterLib = await ethers.getContractFactory("Converter")
  let library = await ConverterLib.deploy();
  await library.deployed();

  const THREE_DAYS = 3 * 24 * 3600;
  // 0x0B12C5479aa9749A8449f23Ae3E50C9A76873622
  const TheDAO = await ethers.getContractFactory("TheDAO",{
    libraries: {
      Converter: library.address,
    }
  });

  const dao = await TheDAO.deploy(
    "0xa5cc3f16a9475740f60826a13F89F532aA8dab0C",
    "0x3Be9De2E8cF39BC661181E21406a7eE265f3C06d",
    parseUnits("200"),
    THREE_DAYS);

  await dao.deployed();

  console.log("TheDAO deployed to:", dao.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
