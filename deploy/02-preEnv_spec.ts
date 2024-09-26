/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import { StBTCMintAuthority__factory, StBTC__factory } from '../typechain-types';
import {
  getContractFromArtifact
} from '../scripts/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  
  const [deployer, stBTC_deployer] = await ethers.getSigners();
  
  const mintstBTCAuthorityAddress = "";
  const stakePlanHub_proxy = "";
  const bridge_proxy = "";
  const stBTCAddress = ""

  const stBTCContract = StBTC__factory.connect(stBTCAddress)
  const tx = await stBTCContract.connect(stBTC_deployer).setNewMinterContract(mintstBTCAuthorityAddress);
  await tx.wait();
  console.log('setNewMinterContract success')

  const mintstBTCAuthority = StBTCMintAuthority__factory.connect(mintstBTCAuthorityAddress)
  const tx1 = await mintstBTCAuthority.connect(deployer).setMinter(stakePlanHub_proxy)
  await tx1.wait();
  console.log('setMinter success')

  const tx2 = await mintstBTCAuthority.connect(deployer).setMinter(bridge_proxy)
  await tx2.wait();
  console.log('setMinter success')
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['preEnv']

export default deployFn
