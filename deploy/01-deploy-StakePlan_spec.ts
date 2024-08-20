/* Imports: Internal */
import { DeployFunction } from 'hardhat-deploy/dist/types'
import { ethers } from 'hardhat';
import {getContractAddress} from '@ethersproject/address';
import {
  deployAndVerifyAndThen
} from '../scripts/deploy-utils'

const deployFn: DeployFunction = async (hre) => {
  const [ , , stake_planer ] = await ethers.getSigners();

  const stakePlanerNonce = await stake_planer.getNonce();
  const stakePlanHubAddress = getContractAddress({
    from: stake_planer.address,
    nonce: stakePlanerNonce + 2
  })
  console.log("stakePlanHubAddress: ", stakePlanHubAddress)
  
  const stBTCAddress = "0x2a45dE58552F2C5E0597d1FbB8eC83F7E2dDBa0D"
  
  const chainId = hre.network.config.chainId;
  if(chainId != 8329 && chainId != 83291){
    await deployAndVerifyAndThen({
      hre,
      name: "StakePlan",
      contract: 'StakePlan',
      args: [stakePlanHubAddress, stBTCAddress],
      from: stake_planer.address,
    })
  }
}

// This is kept during an upgrade. So no upgrade tag.
deployFn.tags = ['DeployStakePlanImpl']

export default deployFn
