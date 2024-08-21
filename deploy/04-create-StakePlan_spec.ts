/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'

import { ethers, upgrades } from 'hardhat';
import { BTCB__factory, StakePlanHub__factory } from '../typechain-types';

const deployFn: DeployFunction = async (hre) => {
  const [deployer, stBTC_deployer, stake_planer] = await ethers.getSigners();

  const proxyAddr = "0x5c23c303679D67fc78c9A204B1aB49232b464af1";

  const stakePlanHub = StakePlanHub__factory.connect(proxyAddr)
  const custodyAddress = "0x0534AbE62c23e6F2Dc2294C7b46E6340643346ae"
  
  const tx = await stakePlanHub.connect(deployer).createNewPlan(
    "BabylonStakePlan-1",
    "yat1-Babylon",
    custodyAddress,
    1724214336,
  )
  await tx.wait();
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['CreateStakePlan']

export default deployFn