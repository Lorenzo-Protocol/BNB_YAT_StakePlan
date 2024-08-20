
import { expect } from 'chai';
import {
} from '../../typechain-types';
import {
    stBTCMintAuthority,
    deployer,
    makeSuiteCleanRoom,
    uesrAddress,
    stBTC_deployer,
    deployerAddress,
    stBTC,
    stBTCMintAuthorityAddress,
    user,
} from '../__setup.spec';
import { ERRORS } from '../helpers/errors';
import { ethers } from 'hardhat';
import { ZERO_ADDRESS } from '../helpers/constants';
  
makeSuiteCleanRoom('stBTC Mint Authrity', function () {
    context('Generic', function () {
        
        const role = ethers.keccak256(ethers.toUtf8Bytes("STBTC_MINTER_ROLE"));
        const mintAmount = ethers.parseEther("1");

        context('Negatives', async function () {

            it('failed to set minter if not have permission', async function () {
                await expect(stBTC.connect(deployer).setNewMinterContract(uesrAddress)).to.be.revertedWithCustomError(stBTC, ERRORS.OwnableUnauthorizedAccount);
            });

            it('failed to set minter if use invalid address', async function () {
                await expect(stBTC.connect(stBTC_deployer).setNewMinterContract(ZERO_ADDRESS)).to.be.revertedWithCustomError(stBTC, ERRORS.InvalidAddress);
            });

            it('cannot mint stBTC if not have authority', async function () {
                await expect(stBTCMintAuthority.connect(deployer).mint(uesrAddress, mintAmount)).to.be.revertedWithCustomError(stBTCMintAuthority, ERRORS.AccessControlUnauthorizedAccount);
            });

            it('cannot set Minter if not have permission', async function () {
                await expect(stBTCMintAuthority.connect(stBTC_deployer).setMinter(uesrAddress)).to.be.revertedWithCustomError(stBTCMintAuthority, ERRORS.AccessControlUnauthorizedAccount);
            });

            it('cannot remove Minter if not have permission', async function () {
                await expect(stBTCMintAuthority.connect(stBTC_deployer).removeMinter(uesrAddress)).to.be.revertedWithCustomError(stBTCMintAuthority, ERRORS.AccessControlUnauthorizedAccount);
            });

            it('failed to mint stBTC if contract not have right to mint stBTC', async function () {
                await expect(stBTCMintAuthority.connect(deployer).setMinter(deployerAddress)).to.be.not.reverted;
                await expect(stBTCMintAuthority.connect(deployer).mint(uesrAddress, mintAmount)).to.be.revertedWithCustomError(stBTC, ERRORS.InvalidMinter);
            });
        })
        context('Scenarios', async function () {

            it('get correct balance if mint stBTC success', async function () {
                await expect(stBTC.connect(stBTC_deployer).setNewMinterContract(deployerAddress)).to.be.not.reverted;
                expect(await stBTC.balanceOf(deployerAddress)).to.be.eq(0);
                await expect(stBTC.connect(deployer).mint(deployerAddress, mintAmount)).to.be.not.reverted;
                expect(await stBTC.balanceOf(deployerAddress)).to.be.eq(mintAmount);
            });

            it('set Minter if have permission', async function () {
                await expect(stBTCMintAuthority.connect(deployer).setMinter(uesrAddress)).to.be.not.reverted;
                expect(await stBTCMintAuthority.hasRole(role, uesrAddress)).to.be.true;
            });

            it('remove Minter if have permission', async function () {
                await expect(stBTCMintAuthority.connect(deployer).setMinter(uesrAddress)).to.be.not.reverted;
                expect(await stBTCMintAuthority.hasRole(role, uesrAddress)).to.be.true;
                await expect(stBTCMintAuthority.connect(deployer).removeMinter(uesrAddress)).to.be.not.reverted;
                expect(await stBTCMintAuthority.hasRole(role, uesrAddress)).to.be.false;
            });

            it('get correct balance if mint stBTC success from minter contract', async function () {
                await expect(stBTC.connect(stBTC_deployer).setNewMinterContract(stBTCMintAuthorityAddress)).to.be.not.reverted;
                expect(await stBTC.balanceOf(deployerAddress)).to.be.eq(0);

                await expect(stBTCMintAuthority.connect(deployer).setMinter(uesrAddress)).to.be.not.reverted;
                expect(await stBTCMintAuthority.hasRole(role, uesrAddress)).to.be.true;

                await expect(stBTCMintAuthority.connect(user).mint(deployerAddress, mintAmount)).to.be.not.reverted;
                expect(await stBTC.balanceOf(deployerAddress)).to.be.eq(mintAmount);
            });
        })
    })
})