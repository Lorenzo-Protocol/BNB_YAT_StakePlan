import { Signer, Wallet } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import {
  revertToSnapshot,
  takeSnapshot,
} from './helpers/utils';
import { Bridge, Bridge__factory, BTCB, BTCB__factory, StakePlan, StakePlan__factory, StakePlanHub, StakePlanHub__factory, StBTC, StBTC__factory, StBTCMintAuthority, StBTCMintAuthority__factory } from '../typechain-types';
import {getContractAddress} from '@ethersproject/address';
import { NativeToken } from './helpers/constants';

export let accounts: Signer[];
export let deployer: Signer;
export let stBTC_deployer: Signer;
export let user: Signer;

export let deployerAddress: string;
export let stBTCDeployerAddress: string;
export let uesrAddress: string;

export let stBTC: StBTC;
export let stBTCAddress: string;
export let bridgeProxy: Bridge;

export let stBTCMintAuthority: StBTCMintAuthority;
export let stBTCMintAuthorityAddress: string;

export let stakePlan: StakePlan;
export let stakePlanAddress: string;
export let stakePlanHub: StakePlanHub;
export let stakePlanHubAddress: string;

export let btcb: BTCB;
export let BTCBAddress: string;

export function makeSuiteCleanRoom(name: string, tests: () => void) {
  describe(name, () => {
    beforeEach(async function () {
      await takeSnapshot();
    });
    tests();
    afterEach(async function () {
      await revertToSnapshot();
    });
  });
}

before(async function () {

  accounts = await ethers.getSigners();
  deployer = accounts[0];
  stBTC_deployer = accounts[1];
  user = accounts[2];

  deployerAddress = await deployer.getAddress();
  stBTCDeployerAddress = await stBTC_deployer.getAddress();
  uesrAddress = await user.getAddress();

  stBTC = await new StBTC__factory(stBTC_deployer).deploy();
  stBTCAddress = await stBTC.getAddress();
  console.log("stBTCAddress address: ", stBTCAddress)

  stBTCMintAuthority = await new StBTCMintAuthority__factory(stBTC_deployer).deploy(stBTCAddress, deployerAddress);
  stBTCMintAuthorityAddress = await stBTCMintAuthority.getAddress();
  console.log("stBTCMintAuthorityAddress address: ", stBTCMintAuthorityAddress)


  btcb = await new BTCB__factory(stBTC_deployer).deploy();
  BTCBAddress = await btcb.getAddress();

  const Bridge = await ethers.getContractFactory("Bridge");
  const bridgeProxyD = await upgrades.deployProxy(Bridge, [deployerAddress, deployerAddress, deployerAddress, stBTCMintAuthorityAddress]);
  await bridgeProxyD.waitForDeployment()
  const bridgeProxyAddress = await bridgeProxyD.getAddress()
  console.log("bridgeProxy address: ", bridgeProxyAddress)
  console.log("bridgeProxy admin address: ", await upgrades.erc1967.getAdminAddress(bridgeProxyAddress))
  console.log("bridgeProxy implement address: ", await upgrades.erc1967.getImplementationAddress(bridgeProxyAddress))
  bridgeProxy = Bridge__factory.connect(bridgeProxyAddress, stBTC_deployer);
 
  const deployerNonce = await deployer.getNonce();
  const expectStakePlanHubAddress = getContractAddress({
    from: deployerAddress,
    nonce: deployerNonce + 2
  })
  console.log("expect expectStakePlanHubAddress: ", expectStakePlanHubAddress)
  stakePlan = await new StakePlan__factory(deployer).deploy(expectStakePlanHubAddress);
  stakePlanAddress = await stakePlan.getAddress();
  console.log("stakePlanAddress address: ", stakePlanAddress)

  const StakePlanHub = await ethers.getContractFactory("StakePlanHub");
  const stakePlanProxy = await upgrades.deployProxy(StakePlanHub, [deployerAddress, stakePlanAddress, deployerAddress, stBTCMintAuthorityAddress]);
  await stakePlanProxy.waitForDeployment()
  const stakePlanProxyAddress = await stakePlanProxy.getAddress()
  console.log("stakePlanProxy address: ", stakePlanProxyAddress)
  console.log("stakePlanProxy admin address: ", await upgrades.erc1967.getAdminAddress(stakePlanProxyAddress))
  console.log("stakePlanProxy implement address: ", await upgrades.erc1967.getImplementationAddress(stakePlanProxyAddress))
  stakePlanHub = StakePlanHub__factory.connect(stakePlanProxyAddress, deployer);
  stakePlanHubAddress = await stakePlanHub.getAddress();

  let chainIds = [97, 83291];
  let stBtcChainInfos = [{
    stBTCAddress: stBTCAddress,
    cross_chain_fee: ethers.parseEther("0.005"), //3$ for bnb
  }, {
    stBTCAddress: NativeToken,
    cross_chain_fee: ethers.parseEther("0.00003"), //3$ for lorenzo stbtc
  }]

  //const bridgeProxy = Bridge__factory.connect(bridge_proxy)
  const tx = await bridgeProxy.connect(deployer).setSupportChainId(chainIds, stBtcChainInfos)
  await tx.wait();
});
