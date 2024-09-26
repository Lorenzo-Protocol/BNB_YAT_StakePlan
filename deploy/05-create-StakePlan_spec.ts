/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'

import { ethers, upgrades } from 'hardhat';
import { BTCB__factory, StakePlanHub__factory } from '../typechain-types';

const deployFn: DeployFunction = async (hre) => {
  const [deployer, stBTC_deployer, stake_planer] = await ethers.getSigners();

  const proxyAddr = "";

  const stakePlanHub = StakePlanHub__factory.connect(proxyAddr)
  const Erc20BtcAddress = ""
  const custodyAddress = ""
  
  const tx = await stakePlanHub.connect(deployer).createNewPlan(
    1,
    [Erc20BtcAddress],
    [custodyAddress],
  )
  await tx.wait();
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['CreateStakePlan']

export default deployFn