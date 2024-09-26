/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers, upgrades } from 'hardhat';
import {
  getContractFromArtifact
} from '../scripts/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  const [ deployer, , stake_planer ] = await ethers.getSigners();

  const stBTCMintAuthorityAddress = "";

  const StakePlanHub = await ethers.getContractFactory("StakePlanHub", stake_planer);
  const proxy = await upgrades.deployProxy(StakePlanHub, [deployer.address, deployer.address, stBTCMintAuthorityAddress]);
  await proxy.waitForDeployment()
  
  const proxyAddress = await proxy.getAddress()
  console.log("proxy address: ", proxyAddress)
  console.log("admin address: ", await upgrades.erc1967.getAdminAddress(proxyAddress))
  console.log("implement address: ", await upgrades.erc1967.getImplementationAddress(proxyAddress))
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['DeployStakePlanHub']

export default deployFn
