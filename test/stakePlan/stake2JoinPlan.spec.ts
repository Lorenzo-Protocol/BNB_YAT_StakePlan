
import { expect } from 'chai';
import { StakePlan__factory } from '../../typechain-types';
import {
    deployer,
    makeSuiteCleanRoom,
    uesrAddress,
    stakePlanHub,
    BTCBAddress,
    user,
    stBTC,
    stBTC_deployer,
    stBTCMintAuthorityAddress,
    stBTCMintAuthority,
    btcb,
    stakePlanHubAddress,
    deployerAddress,
} from '../__setup.spec';
import { ERRORS } from '../helpers/errors';
import { ethers } from 'hardhat';
import { ZERO_ADDRESS } from '../helpers/constants';
  
let oldTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) - 3600
let stakePlanStartTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 3600
let periodTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 7 * 24 * 3600
let name = "Stake Plan 1"
let symbol = "SP1"
let descUri = "https://www.google.com"
let agentId = 1
let mintAmount = ethers.parseEther("100")
let stakeAmount = ethers.parseEther("1")

makeSuiteCleanRoom('Stake BTC to Join StakePlan', function () {
    context('Generic', function () {
        
        beforeEach(async function () {
            await expect(stakePlanHub.connect(deployer).addSupportBtcContractAddress([BTCBAddress])).to.be.not.reverted
            await expect(stakePlanHub.connect(deployer).setStBTCMintAuthorityAddress(stBTCMintAuthorityAddress)).to.be.not.reverted

            await expect(stBTC.connect(stBTC_deployer).setNewMinterContract(stBTCMintAuthorityAddress)).to.be.not.reverted;
            await expect(stBTCMintAuthority.connect(deployer).setMinter(stakePlanHubAddress)).to.be.not.reverted;

            await expect(stakePlanHub.connect(deployer).createNewPlan({
                name: name,
                symbol: symbol,
                descUri: descUri,
                agentId: agentId,
                stakePlanStartTime: stakePlanStartTime,
                periodTime: periodTime
            })).to.be.not.reverted
        });

        context('Negatives', async function () {
            it('failed to stake if use invalid planid', async function () {
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(1, BTCBAddress, stakeAmount)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });

            it('failed to stake if use invalid btcContract address', async function () {
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(0, uesrAddress, stakeAmount)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidBTCContractAddress);
            });

            it('failed to stake if stakeplan not avaliable', async function () {
                await expect(stakePlanHub.connect(deployer).setStakePlanAvailable(0, true)).to.be.not.reverted

                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(0, BTCBAddress, stakeAmount)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.StakePlanNotAvailable);
            });

            it('failed to stake if stakeplan not reach the start time', async function () {
                await expect(btcb.connect(user).mint(uesrAddress, mintAmount)).to.be.not.reverted
                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount);
                await expect(btcb.connect(user).approve(stakePlanHubAddress, mintAmount)).to.be.not.reverted
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(0, BTCBAddress, stakeAmount)).to.be.reverted
            });

            it('failed to withdraw BTCB if use invalid planid', async function () {
                await expect(stakePlanHub.connect(deployer).withdrawBTC(1, deployerAddress)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });

            it('failed to withdraw BTCB if no permission', async function () {
                await expect(stakePlanHub.connect(user).withdrawBTC(1, deployerAddress)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
            });

            it('failed to withdraw BTCB if use zero address', async function () {
                await expect(stakePlanHub.connect(deployer).withdrawBTC(0, ZERO_ADDRESS)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidAddress);
            });
        })
        context('Scenarios', async function () {

            it('update valiable if stake successful', async function () {
                const stakePlanAddr = await stakePlanHub.connect(deployer)._stakePlanMap(0)
                const stakePlan = StakePlan__factory.connect(stakePlanAddr);
                expect(await stakePlan.connect(deployer)._totalRaisedStBTC()).to.be.equal(0);
                
                await ethers.provider.send("evm_increaseTime", [2 * 3600]);
                await expect(btcb.connect(user).mint(uesrAddress, mintAmount)).to.be.not.reverted
                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount);
                await expect(btcb.connect(user).approve(stakePlanHubAddress, mintAmount)).to.be.not.reverted
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(0, BTCBAddress, stakeAmount)).to.be.not.reverted

                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount - stakeAmount);
                expect(await btcb.balanceOf(stakePlanAddr)).to.be.eq(stakeAmount);
                expect(await btcb.balanceOf(deployerAddress)).to.be.eq(0);

                expect(await stBTC.balanceOf(uesrAddress)).to.be.eq(stakeAmount);

                expect(await stakePlan.connect(deployer)._totalRaisedStBTC()).to.be.equal(stakeAmount);
                expect(await stakePlan.connect(deployer)._userStakeInfo(uesrAddress)).to.be.equal(stakeAmount);

                await expect(stakePlanHub.connect(deployer).withdrawBTC(0, deployerAddress)).to.be.not.reverted
                expect(await btcb.balanceOf(deployerAddress)).to.be.eq(stakeAmount);
                expect(await btcb.balanceOf(stakePlanAddr)).to.be.eq(0);
            });
        })
    })
})