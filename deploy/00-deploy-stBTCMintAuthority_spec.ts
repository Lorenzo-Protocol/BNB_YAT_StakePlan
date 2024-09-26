/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import {
  deployAndVerifyAndThen
} from '../scripts/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  const [ deployer, stBTC_deployer, stake_planer ] = await ethers.getSigners();
  
  const stBTCAddress = ""

  await deployAndVerifyAndThen({
    hre,
    name: "stBTCMintAuthority",
    contract: 'stBTCMintAuthority',
    args: [stBTCAddress, deployer.address],
    from: stake_planer.address,
  })
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['DeploystBTCMintAuthority']

export default deployFn
