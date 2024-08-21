/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'

import { ethers, upgrades } from 'hardhat';

const deployFn: DeployFunction = async (hre) => {
  const [ deployer, stBTC_deployer, stake_planer ] = await ethers.getSigners();

  const proxyAddr = "0x5c23c303679D67fc78c9A204B1aB49232b464af1";
  const StakePlanHub = await ethers.getContractFactory("StakePlanHub", stake_planer);
  const proxy = await upgrades.upgradeProxy(proxyAddr, StakePlanHub);
  await proxy.waitForDeployment()
  
  const proxyAddress = await proxy.getAddress()
  console.log("proxy address: ", proxyAddress)
  console.log("admin address: ", await upgrades.erc1967.getAdminAddress(proxyAddress))
  console.log("implement address: ", await upgrades.erc1967.getImplementationAddress(proxyAddress))
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['UpgradeStakePlanHub']

export default deployFn