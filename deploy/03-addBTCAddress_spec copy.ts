/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import { StBTCMintAuthority__factory, StBTC__factory, StakePlanHub__factory } from '../typechain-types';

const deployFn: DeployFunction = async (hre) => {
  
  const [ deployer, stBTC_deployer ] = await ethers.getSigners();

  const stakePlanHub_proxy = "0x5c23c303679D67fc78c9A204B1aB49232b464af1";
  const MockBtcbAddress = "0x49fF00552CA23899ba9f814bCf7eD55bC5cDd9Ce";

  const stakePlan_Hub = StakePlanHub__factory.connect(stakePlanHub_proxy)
  const tx = await stakePlan_Hub.connect(deployer).addSupportBtcContractAddress([MockBtcbAddress]);
  await tx.wait();
  console.log('setNewMinterContract success')
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['AddBTCBAddress']

export default deployFn
