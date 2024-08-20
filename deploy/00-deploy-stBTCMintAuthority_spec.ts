/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import {
  deployAndVerifyAndThen
} from '../scripts/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  const [ deployer, stBTC_deployer, stake_planer ] = await ethers.getSigners();
  console.log("deployer address: ", deployer.address)
  console.log("stBTC_deployer address: ", stBTC_deployer.address)
  console.log("stake_planer address: ", stake_planer.address)
  
  const chainId = hre.network.config.chainId;
  if(chainId != 8329 && chainId != 83291){

    const stBTCAddress = "0x2a45dE58552F2C5E0597d1FbB8eC83F7E2dDBa0D"

    await deployAndVerifyAndThen({
      hre,
      name: "stBTCMintAuthority",
      contract: 'stBTCMintAuthority',
      args: [stBTCAddress, deployer.address],
      from: stake_planer.address,
    })
  }
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['DeploystBTCMintAuthority']

export default deployFn
