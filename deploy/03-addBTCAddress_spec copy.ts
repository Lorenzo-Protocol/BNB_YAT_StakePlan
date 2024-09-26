/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import { StBTCMintAuthority__factory, StBTC__factory, StakePlanHub__factory } from '../typechain-types';

const deployFn: DeployFunction = async (hre) => {
  
  const [ deployer, stBTC_deployer ] = await ethers.getSigners();

  const stakePlanHub_proxy = "";
  const Erc20BtcAddress = "";

  const stakePlan_Hub = StakePlanHub__factory.connect(stakePlanHub_proxy)

  const tx0 = await stakePlan_Hub.connect(deployer).setCrossMintYatFee(ethers.parseEther("0.00003"));
  await tx0.wait();
  console.log('setCrossMintYatFee success')

  const tx = await stakePlan_Hub.connect(deployer).addSupportBtcContractAddress([Erc20BtcAddress]);
  await tx.wait();
  console.log('addSupportBtcContractAddress success')
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['AddBTCBAddress']

export default deployFn
