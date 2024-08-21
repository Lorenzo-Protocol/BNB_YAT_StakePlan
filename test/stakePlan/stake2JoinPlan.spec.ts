
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
    custodyAddress,
} from '../__setup.spec';
import { ERRORS } from '../helpers/errors';
import { ethers } from 'hardhat';
import { BYTES32_MERKLE_ROOT, BYTES32_ZERO_ADDRESS, ZERO_ADDRESS } from '../helpers/constants';

let stakePlanStartTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 3600
let name = "Stake Plan 1"
let symbol = "SP1"
let mintAmount = ethers.parseEther("100")
let stakeAmount = ethers.parseEther("1")

makeSuiteCleanRoom('Stake BTC to Join StakePlan', function () {
    context('Generic', function () {
        
        beforeEach(async function () {
            await expect(stakePlanHub.connect(deployer).addSupportBtcContractAddress([BTCBAddress])).to.be.not.reverted
            await expect(stakePlanHub.connect(deployer).setStBTCMintAuthorityAddress(stBTCMintAuthorityAddress)).to.be.not.reverted

            await expect(stBTC.connect(stBTC_deployer).setNewMinterContract(stBTCMintAuthorityAddress)).to.be.not.reverted;
            await expect(stBTCMintAuthority.connect(deployer).setMinter(stakePlanHubAddress)).to.be.not.reverted;

            await expect(stakePlanHub.connect(deployer).createNewPlan(
                name,
                symbol,
                custodyAddress,
                stakePlanStartTime
            )).to.be.not.reverted
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

            it('failed to set merkle root if invaild planId', async function () {
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(1, 0, BYTES32_MERKLE_ROOT)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });

            it('failed to set merkle root if empty bytes32', async function () {
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(0, 0, BYTES32_ZERO_ADDRESS)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.EmptyMerkleRoot);
            });

            it('failed to set merkle root if not admin', async function () {
                await expect(stakePlanHub.connect(user).setMerkleRoot(0, 0, BYTES32_MERKLE_ROOT)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
            });

            it('failed to set merkle root if pause', async function () {
                await expect(stakePlanHub.connect(deployer).adminPause()).to.be.not.reverted
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(0, 0, BYTES32_MERKLE_ROOT)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.EnforcedPause);
            });

            it('failed to mint YAT if invaild planId', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(1, [uesrAddress], [stakeAmount], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });

            it('failed to mint YAT if not admin', async function () {
                await expect(stakePlanHub.connect(user).mintYATFromLorenzo(0, [uesrAddress], [stakeAmount], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
            });

            it('failed to mint YAT if arr length not equal', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(0, [], [stakeAmount], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidParam);
            });

            it('failed to mint YAT if arr var eligal', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(0, [uesrAddress], [0], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidParam);
            });

            it('failed to mint YAT if use same hash', async function () {
                await ethers.provider.send("evm_increaseTime", [2 * 3600]);
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(0, [uesrAddress, uesrAddress], [100,100], [BYTES32_MERKLE_ROOT, BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidParam);
            });

            it('failed to mint YAT if use same hash', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(0, [uesrAddress], [100], [BYTES32_MERKLE_ROOT])).to.be.reverted
            });
        })
        context('Scenarios', async function () {

            it('update valiable if stake successful', async function () {
                const stakePlanAddr = await stakePlanHub.connect(deployer)._stakePlanMap(0)
                const stakePlan = StakePlan__factory.connect(stakePlanAddr);
                expect(await stakePlan.connect(deployer).totalSupply()).to.be.equal(0);
                
                await ethers.provider.send("evm_increaseTime", [2 * 3600]);
                await expect(btcb.connect(user).mint(uesrAddress, mintAmount)).to.be.not.reverted
                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount);
                await expect(btcb.connect(user).approve(stakePlanHubAddress, mintAmount)).to.be.not.reverted
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(0, BTCBAddress, stakeAmount)).to.be.not.reverted

                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount - stakeAmount);
                expect(await btcb.balanceOf(custodyAddress)).to.be.eq(stakeAmount);
                expect(await btcb.balanceOf(deployerAddress)).to.be.eq(0);

                expect(await stBTC.balanceOf(uesrAddress)).to.be.eq(stakeAmount);
            });

            it('get correct value if set merkle root success', async function () {
                const stakePlanAddr = await stakePlanHub.connect(deployer)._stakePlanMap(0)
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(0, 0, BYTES32_MERKLE_ROOT)).to.be.not.reverted
                const stakePlan = StakePlan__factory.connect(stakePlanAddr);
                expect(await stakePlan.connect(deployer)._merkleRoot(0)).to.be.equal(BYTES32_MERKLE_ROOT);
            });
        })
    })
})