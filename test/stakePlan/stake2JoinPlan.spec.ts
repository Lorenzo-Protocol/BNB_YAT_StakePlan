
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
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(2, BTCBAddress, stakeAmount)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });

            it('failed to stake if use invalid btcContract address', async function () {
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(1, uesrAddress, stakeAmount)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidBTCContractAddress);
            });

            it('failed to stake if stakeplan not avaliable', async function () {
                await expect(stakePlanHub.connect(deployer).setStakePlanAvailable(1, true)).to.be.not.reverted

                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(1, BTCBAddress, stakeAmount)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.StakePlanNotAvailable);
            });

            it('failed to stake if stakeplan not reach the start time', async function () {
                await expect(btcb.connect(user).mint(uesrAddress, mintAmount)).to.be.not.reverted
                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount);
                await expect(btcb.connect(user).approve(stakePlanHubAddress, mintAmount)).to.be.not.reverted
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(1, BTCBAddress, stakeAmount)).to.be.reverted
            });

            it('failed to set merkle root if invaild planId', async function () {
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(2, 0, BYTES32_MERKLE_ROOT)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });

            it('failed to set merkle root if empty bytes32', async function () {
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(1, 0, BYTES32_ZERO_ADDRESS)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.EmptyMerkleRoot);
            });

            it('failed to set merkle root if not admin', async function () {
                await expect(stakePlanHub.connect(user).setMerkleRoot(1, 0, BYTES32_MERKLE_ROOT)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
            });

            it('failed to set merkle root if pause', async function () {
                await expect(stakePlanHub.connect(deployer).adminPause()).to.be.not.reverted
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(1, 0, BYTES32_MERKLE_ROOT)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.EnforcedPause);
            });

            it('failed to mint YAT if invaild planId', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(2, [uesrAddress], [stakeAmount], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });

            it('failed to mint YAT if not admin', async function () {
                await expect(stakePlanHub.connect(user).mintYATFromLorenzo(1, [uesrAddress], [stakeAmount], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
            });

            it('failed to mint YAT if arr length not equal', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(1, [], [stakeAmount], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidParam);
            });

            it('failed to mint YAT if arr var eligal', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(1, [uesrAddress], [0], [BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidParam);
            });

            it('failed to mint YAT if use same hash', async function () {
                await ethers.provider.send("evm_increaseTime", [2 * 3600]);
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(1, [uesrAddress, uesrAddress], [100,100], [BYTES32_MERKLE_ROOT, BYTES32_MERKLE_ROOT])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidParam);
            });

            it('failed to mint YAT if use same hash', async function () {
                await expect(stakePlanHub.connect(deployer).mintYATFromLorenzo(1, [uesrAddress], [100], [BYTES32_MERKLE_ROOT])).to.be.reverted
            });
        })
        context('Scenarios', async function () {

            it('update valiable if stake successful', async function () {
                const stakePlanAddr = await stakePlanHub.connect(deployer)._stakePlanMap(1)
                const stakePlan = StakePlan__factory.connect(stakePlanAddr);
                expect(await stakePlan.connect(deployer).totalSupply()).to.be.equal(0);
                
                await ethers.provider.send("evm_increaseTime", [2 * 3600]);
                await expect(btcb.connect(user).mint(uesrAddress, mintAmount)).to.be.not.reverted
                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount);
                await expect(btcb.connect(user).approve(stakePlanHubAddress, mintAmount)).to.be.not.reverted
                await expect(stakePlanHub.connect(user).stakeBTC2JoinStakePlan(1, BTCBAddress, stakeAmount)).to.be.not.reverted

                expect(await btcb.balanceOf(uesrAddress)).to.be.eq(mintAmount - stakeAmount);
                expect(await btcb.balanceOf(custodyAddress)).to.be.eq(stakeAmount);
                expect(await btcb.balanceOf(deployerAddress)).to.be.eq(0);

                expect(await stBTC.balanceOf(uesrAddress)).to.be.eq(stakeAmount);
            });

            it('get correct value if set merkle root success', async function () {
                const stakePlanAddr = await stakePlanHub.connect(deployer)._stakePlanMap(1)
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(1, 0, BYTES32_MERKLE_ROOT)).to.be.not.reverted
                const stakePlan = StakePlan__factory.connect(stakePlanAddr);
                expect(await stakePlan.connect(deployer)._merkleRoot(0)).to.be.equal(BYTES32_MERKLE_ROOT);
            });

            it('claim success when use right merkle proof', async function () {
                const merkle_root = "0x5c0581109e581b4bb812e6878e8902568ecd1a18bf80157ef00d51260445676f"
                const uesrAddress = "0x72281a602539d2e31a1129dee7d26c4960c8f787"
                const stakePlanAddr = await stakePlanHub.connect(deployer)._stakePlanMap(1)
                const amount = 1100000000000000
                const proof = [
                    "0x870e0de6f527e21577df0e9cc268dff962021f84f9aadee476a02c69fd8a849b", "0xb661dc594388ef9a2f3ac181cf38ff7c3e86f8bebc73d0a94c4c7295164f4e2e", "0x9376fb8fa44bd06b70cacccfff69fc6eddb9e7e9c08f84854ff3f0593207e1d8", "0x2d7cc73bc23da434410683a43b47b69b17571106df88b4dd9bd1230b5fb8c7a8", "0x06a769ba2ffcd27fd298c84d177604ab6b788aa1c1e5864d48fd60b8ddf5b1a4" 
                ]
                await expect(stakePlanHub.connect(deployer).setMerkleRoot(1, 0, merkle_root)).to.be.not.reverted
                const stakePlan = StakePlan__factory.connect(stakePlanAddr);
                expect(await stakePlan.connect(deployer)._merkleRoot(0)).to.be.equal(merkle_root);
                await expect(stakePlan.connect(deployer).claimYATToken(uesrAddress, 0, amount, proof)).to.be.not.reverted;
                expect(await stakePlan.connect(deployer).balanceOf(uesrAddress)).to.equal(amount);
            });
        })
    })
})