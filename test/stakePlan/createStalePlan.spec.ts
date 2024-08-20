
import { expect } from 'chai';
import { StakePlan__factory } from '../../typechain-types';
import {
    stBTCMintAuthority,
    deployer,
    makeSuiteCleanRoom,
    stBTC_deployer,
    stBTC,
    stBTCMintAuthorityAddress,
    stakePlanHubAddress,
    stakePlanHub,
    BTCBAddress,
} from '../__setup.spec';
import { ERRORS } from '../helpers/errors';
import { ZERO_ADDRESS } from '../helpers/constants';

let oldTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) - 3600
let stakePlanStartTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 3600
let periodTime = parseInt((new Date().getTime() / 1000 ).toFixed(0)) + 7 * 24 * 3600
let name = "Stake Plan 1"
let symbol = "SP1"
let descUri = "https://www.google.com"
let agentId = 1
  
makeSuiteCleanRoom('create stake plan', function () {
    context('Generic', function () {
        
        beforeEach(async function () {
            await expect(stBTC.connect(stBTC_deployer).setNewMinterContract(stBTCMintAuthorityAddress)).to.be.not.reverted;
            await expect(stBTCMintAuthority.connect(deployer).setMinter(stakePlanHubAddress)).to.be.not.reverted;
            await expect(stakePlanHub.connect(deployer).addSupportBtcContractAddress([BTCBAddress])).to.be.not.reverted
        });

        context('Negatives', async function () {

            it('failed to create stake plan if not lorenzo admin', async function () {
                await expect(stakePlanHub.connect(stBTC_deployer).createNewPlan({
                    name: name,
                    symbol: symbol,
                    descUri: descUri,
                    agentId: agentId,
                    stakePlanStartTime: stakePlanStartTime,
                    periodTime: periodTime
                })).to.be.revertedWithCustomError(stakePlanHub, ERRORS.NoPermission);
            });

            it('failed to create stake plan if pause the stake plan', async function () {
                await expect(stakePlanHub.connect(deployer).adminPauseBridge()).to.be.not.reverted
                await expect(stakePlanHub.connect(deployer).createNewPlan({
                    name: name,
                    symbol: symbol,
                    descUri: descUri,
                    agentId: agentId,
                    stakePlanStartTime: stakePlanStartTime,
                    periodTime: periodTime
                })).to.be.revertedWithCustomError(stakePlanHub, ERRORS.EnforcedPause);
            });

            it('failed to create stake plan if time not suitable', async function () {
                await expect(stakePlanHub.connect(deployer).createNewPlan({
                    name: name,
                    symbol: symbol,
                    descUri: descUri,
                    agentId: agentId,
                    stakePlanStartTime: oldTime,
                    periodTime: periodTime
                })).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidTime);

                await expect(stakePlanHub.connect(deployer).createNewPlan({
                    name: name,
                    symbol: symbol,
                    descUri: descUri,
                    agentId: agentId,
                    stakePlanStartTime: stakePlanStartTime,
                    periodTime: 0
                })).to.be.revertedWithCustomError(stakePlanHub, ERRORS.InvalidTime);
            });
        })
        context('Scenarios', async function () {

            it('get correct valiable if create stake plan succcess', async function () {
                expect(await stakePlanHub.connect(deployer)._stakePlanMap(0)).to.be.equal(ZERO_ADDRESS)
                await expect(stakePlanHub.connect(deployer).createNewPlan({
                    name: name,
                    symbol: symbol,
                    descUri: descUri,
                    agentId: agentId,
                    stakePlanStartTime: stakePlanStartTime,
                    periodTime: periodTime
                })).to.be.not.reverted

                expect(await stakePlanHub.connect(deployer)._stakePlanCounter()).to.be.equal(1);
                expect(await stakePlanHub.connect(deployer)._stakePlanMap(0)).to.be.not.equal(ZERO_ADDRESS)
                const stakePlanAddr = await stakePlanHub.connect(deployer)._stakePlanMap(0)
                const stakePlan = StakePlan__factory.connect(stakePlanAddr)

                expect(await stakePlan.connect(deployer)._planId()).to.be.equal(0);
                expect(await stakePlan.connect(deployer)._name()).to.be.equal(name);
                expect(await stakePlan.connect(deployer)._symbol()).to.be.equal(symbol);
                expect(await stakePlan.connect(deployer)._descUri()).to.be.equal(descUri);
                expect(await stakePlan.connect(deployer)._agentId()).to.be.equal(agentId);
                expect(await stakePlan.connect(deployer)._stakePlanStartTime()).to.be.equal(stakePlanStartTime);
                expect(await stakePlan.connect(deployer)._periodTime()).to.be.equal(periodTime);
            });
        })
    })
})