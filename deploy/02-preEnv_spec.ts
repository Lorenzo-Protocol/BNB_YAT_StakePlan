/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import { StBTCMintAuthority__factory, StBTC__factory } from '../typechain-types';
import {
  getContractFromArtifact
} from '../scripts/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  
  const [ deployer, stBTC_deployer ] = await ethers.getSigners();
  const stBTCMintAuthority = await getContractFromArtifact(
    hre,
    "stBTCMintAuthority"
  )
  const mintstBTCAuthorityAddress = await stBTCMintAuthority.getAddress();


  const stakePlanHub_proxy = "0x5c23c303679D67fc78c9A204B1aB49232b464af1";
  const bridge_proxy = "0xb7C0817Dd23DE89E4204502dd2C2EF7F57d3A3B8";
  const stBTCAddress = "0x2a45dE58552F2C5E0597d1FbB8eC83F7E2dDBa0D"

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
