
import { expect } from 'chai';
import {
    deployer,
    makeSuiteCleanRoom,
    uesrAddress,
    stBTC_deployer,
    deployerAddress,
    stBTCMintAuthorityAddress,
    stakePlanHub,
    user,
    custodyAddress,
} from '../__setup.spec';
import { ERRORS } from '../helpers/errors';
import { NativeToken, ZERO_ADDRESS } from '../helpers/constants';
  
let stakePlanStartTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 3600
let name = "Stake Plan 1"
let symbol = "SP1"

makeSuiteCleanRoom('Modify env', function () {
    context('Generic', function () {
        
        beforeEach(async function () {
            await expect(stakePlanHub.connect(deployer).createNewPlan(
                name,
                symbol,
                custodyAddress,
                stakePlanStartTime
            )).to.be.not.reverted

            expect(await stakePlanHub.connect(deployer)._lorenzoAdmin()).to.be.equal(deployerAddress);
            expect(await stakePlanHub.connect(deployer)._governance()).to.be.equal(deployerAddress);
            expect(await stakePlanHub.connect(deployer)._stakePlanCounter()).to.be.equal(1);
            expect(await stakePlanHub.connect(deployer)._stBTCMintAuthorityAddress()).to.be.equal(stBTCMintAuthorityAddress);
            expect(await stakePlanHub.connect(deployer).paused()).to.be.false
        });

        context('Negatives', async function () {

            it('failed to update valiable if not have permission', async function () {
                await expect(stakePlanHub.connect(stBTC_deployer).setLorenzoAdmin(uesrAddress)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
                await expect(stakePlanHub.connect(stBTC_deployer).setStBTCMintAuthorityAddress(uesrAddress)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
                await expect(stakePlanHub.connect(stBTC_deployer).setGovernance(uesrAddress)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
                await expect(stakePlanHub.connect(stBTC_deployer).addSupportBtcContractAddress([uesrAddress])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
                await expect(stakePlanHub.connect(stBTC_deployer).removeSupportBtcContractAddress([uesrAddress])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);

                await expect(stakePlanHub.connect(stBTC_deployer).adminPause()).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
                await expect(stakePlanHub.connect(stBTC_deployer).adminUnpause()).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
                await expect(stakePlanHub.connect(stBTC_deployer).setStakePlanAvailable(0, true)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
            });

            it('failed to update valiable if zero address', async function () {
                await expect(stakePlanHub.connect(deployer).setLorenzoAdmin(ZERO_ADDRESS)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidAddress);
                await expect(stakePlanHub.connect(deployer).setStBTCMintAuthorityAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidAddress);
                await expect(stakePlanHub.connect(deployer).setGovernance(ZERO_ADDRESS)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidAddress);
                await expect(stakePlanHub.connect(deployer).addSupportBtcContractAddress([ZERO_ADDRESS])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidAddress);
                await expect(stakePlanHub.connect(deployer).addSupportBtcContractAddress([NativeToken])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidAddress);
                await expect(stakePlanHub.connect(deployer).removeSupportBtcContractAddress([ZERO_ADDRESS])).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidAddress);
            });

            it('failed to setStakePlanAvailable if invalide plan id', async function () {
                await expect(stakePlanHub.connect(deployer).setStakePlanAvailable(2, true)).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidPlanId);
            });
        })
        context('Scenarios', async function () {

            it('update valiable if have right permission', async function () {

                await expect(stakePlanHub.connect(deployer).adminPause()).to.be.not.reverted
                expect(await stakePlanHub.connect(deployer).paused()).to.be.true

                await expect(stakePlanHub.connect(deployer).adminUnpause()).to.be.not.reverted
                expect(await stakePlanHub.connect(deployer).paused()).to.be.false
                
                await expect(stakePlanHub.connect(deployer).setLorenzoAdmin(uesrAddress)).to.be.not.reverted
                await expect(stakePlanHub.connect(deployer).setStBTCMintAuthorityAddress(uesrAddress)).to.be.not.reverted
                
                const res = await stakePlanHub.connect(deployer).getSupportBtcContractAddress()
                expect(res.length).to.be.equal(0)

                await expect(stakePlanHub.connect(deployer).addSupportBtcContractAddress([uesrAddress])).to.be.not.reverted
                const res1 = await stakePlanHub.connect(deployer).getSupportBtcContractAddress()
                expect(res1[0]).to.be.equal(uesrAddress)

                await expect(stakePlanHub.connect(deployer).removeSupportBtcContractAddress([uesrAddress])).to.be.not.reverted
                const res3 = await stakePlanHub.connect(deployer).getSupportBtcContractAddress()
                expect(res3.length).to.be.equal(0)

                expect(await stakePlanHub.connect(deployer)._lorenzoAdmin()).to.be.equal(uesrAddress);
                expect(await stakePlanHub.connect(deployer)._stBTCMintAuthorityAddress()).to.be.equal(uesrAddress);

                await expect(stakePlanHub.connect(deployer).setGovernance(uesrAddress)).to.be.not.reverted
                expect(await stakePlanHub.connect(deployer)._governance()).to.be.equal(uesrAddress);

                await expect(stakePlanHub.connect(user).setStakePlanAvailable(1, true)).to.be.not.reverted
            });
        })
    })
})