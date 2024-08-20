// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC20Metadata, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStakePlanHub} from "../interfaces/IStakePlanHub.sol";
import {IStakePlan} from "../interfaces/IStakePlan.sol";
import {StakePlanHubStorage} from "../storage/StakePlanHubStorage.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {IstBTCMintAuthority} from "../interfaces/IstBTCMintAuthority.sol";

/**
 * @title StakePlanHub
 * @author Leven
 *
 * @dev This is the main entrypoint of Lorenzo Stake Plan. It contains governance functionality as well as
 * create new stake plan by lorenzo admin and stakers stake btc & withdraw stBTC functionality.
 *
 * NOTE: StakePlanHub is used to create new stake plan by Lorenzo Admin, and then user can stake BTC(ERC20), eg: WBTC/BTCB to participant in the stake plan.
 *      1. user can stake erc20 btc token to join a stake plan between _subscriptionStartTime and _subscriptionEndTime.
 *      2. after subscription finished. Lorenzo will withdraw all erc20 btc and convert to native btc, then stake to Babylon protocol, also will mint YAT token to stakers in Lorenzo chain, user can claim reward in lorenzo chain when get reward from babylon.
 *      3. after _subscriptionStartTime, user can claim stBTC according to their erc20 btc staked amount. stBTC is the liquidity token launched by Lorenzo Protocol.
 *
 */
contract StakePlanHub is
    IStakePlanHub,
    PausableUpgradeable,
    StakePlanHubStorage
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    error NoPermission();
    error InvalidTime();
    error InvalidAddress();
    error InvalidPlanId();
    error InvalidBTCContractAddress();
    error StakePlanNotAvailable();

    event Initialize(
        address indexed gov,
        address indexed stakePlanImpl,
        address indexed lorenzoAdmin,
        address mintstBTCAuthorityAddress_
    );

    event LorenzoAdminSet(
        address indexed preLorenzoAdmin,
        address indexed newLorenzoAdmin
    );

    event StBTCMintAuthoritySet(
        address indexed preStBTCMintAuthorityAddress,
        address indexed newStBTCMintAuthorityAddress
    );

    event GovernanceSet(
        address indexed preGovernance,
        address indexed newGovernance
    );

    event StakePlanImplSet(
        address indexed preStakePlanImpl,
        address indexed newStakePlanImpl
    );

    event SetStakePlanAvailable(uint256 indexed planId, bool available);

    event CreateNewPlan(
        uint256 indexed planId,
        uint256 indexed agentId,
        address indexed derivedStakePlanAddr,
        uint256 stakePlanStartTime,
        uint256 periodTime,
        string name,
        string symbol,
        string descUri
    );

    event WithdrawBTC(
        uint256 indexed planId,
        address indexed to,
        address btcContractAddress,
        uint256 balance
    );

    event StakeBTC2JoinStakePlan(
        address indexed user,
        uint256 indexed planId,
        address indexed btcContractAddress,
        uint256 stakeAmount,
        uint256 stBTCAmount
    );

    event BTCContractAddressAdd(address btcContractAddress);
    event BTCContractAddressRemove(address btcContractAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev This modifier reverts if the caller is not the configured lorenzo admin.
     */
    modifier onlyLorenzoAdmin() {
        if (msg.sender != _lorenzoAdmin) {
            revert NoPermission();
        }
        _;
    }

    /**
     * @dev This modifier reverts if the caller is not the configured governance address.
     */
    modifier onlyGov() {
        if (msg.sender != _governance) {
            revert NoPermission();
        }
        _;
    }

    /**
     * @dev Initializes the YATStakePlanHub, setting the initial gov_/stakePlanImpl_/lorenzoAdmin_/mintstBTCAuthorityAddress_.
     *
     * @param gov_ The governance address to set.
     * @param stakePlanImpl_ The address to set for the stake plan contract.
     * @param lorenzoAdmin_ The lorenzo admin address to set.
     * @param stBTCMintAuthorityAddress_ The mint stBTC authority address to set.
     */
    function initialize(
        address gov_,
        address stakePlanImpl_,
        address lorenzoAdmin_,
        address stBTCMintAuthorityAddress_
    ) external initializer {
        if (
            gov_ == address(0) ||
            stakePlanImpl_ == address(0) ||
            lorenzoAdmin_ == address(0) ||
            stBTCMintAuthorityAddress_ == address(0)
        ) {
            revert InvalidAddress();
        }
        __Pausable_init();
        _governance = gov_;
        _stakePlanImpl = stakePlanImpl_;
        _lorenzoAdmin = lorenzoAdmin_;
        _stBTCMintAuthorityAddress = stBTCMintAuthorityAddress_;

        emit Initialize(
            _governance,
            _stakePlanImpl,
            _lorenzoAdmin,
            stBTCMintAuthorityAddress_
        );
    }

    /// ***************************************
    /// *****GOV FUNCTIONS*****
    /// ***************************************

    /**
     * @dev Sets the lorenzo admin, which is a permissioned role able to create new stake plan. This function
     * can only be called by the governance address.
     *
     * @param newLorenzoAdmin_ The new lorenzo admin address to set.
     */
    function setLorenzoAdmin(address newLorenzoAdmin_) external onlyGov {
        if (newLorenzoAdmin_ == address(0)) {
            revert InvalidAddress();
        }
        address preLorenzoAdmin = _lorenzoAdmin;
        _lorenzoAdmin = newLorenzoAdmin_;
        emit LorenzoAdminSet(preLorenzoAdmin, _lorenzoAdmin);
    }

    /**
     * @dev Sets the stBTCMintAuthority contract address, which is a permissioned to mint stBTC.
     *
     * @param newStBTCMintAuthorityAddress_ The new stBTCMintAuthority contract address to set.
     */
    function setStBTCMintAuthorityAddress(
        address newStBTCMintAuthorityAddress_
    ) external onlyGov {
        if (newStBTCMintAuthorityAddress_ == address(0)) {
            revert InvalidAddress();
        }
        address preStBTCMintAuthorityAddress = _stBTCMintAuthorityAddress;
        _stBTCMintAuthorityAddress = newStBTCMintAuthorityAddress_;
        emit StBTCMintAuthoritySet(
            preStBTCMintAuthorityAddress,
            _stBTCMintAuthorityAddress
        );
    }

    /**
     * @dev Sets the governance address, which is a permissioned role able to modify config and withdraw erc20 btc from stake plan. This function
     * can only be called by the governance address.
     *
     * @param newGov_ The new governanve address to set.
     */
    function setGovernance(address newGov_) external onlyGov {
        if (newGov_ == address(0)) {
            revert InvalidAddress();
        }
        address preGovernance = _governance;
        _governance = newGov_;
        emit GovernanceSet(preGovernance, _governance);
    }

    /**
     * @dev Sets the stake plan implement address, which is a template contract for create stake plan. This function
     * can only be called by the governance address.
     *
     * @param newStakePlanImpl_ The new stake plan contract address to set.
     */
    function setStakePlanImpl(address newStakePlanImpl_) external onlyGov {
        if (newStakePlanImpl_ == address(0)) {
            revert InvalidAddress();
        }
        address preStakePlanImpl = _stakePlanImpl;
        _stakePlanImpl = newStakePlanImpl_;
        emit StakePlanImplSet(preStakePlanImpl, _stakePlanImpl);
    }

    /**
     * @dev add which btc contract address be supported by lorenzo stake plan. eg: WBTC/BTCB/... This function
     * can only be called by the governance address.
     *
     * @param btcContractAddress_ The array address of erc20 btc contract address to set.
     */
    function addSupportBtcContractAddress(
        address[] memory btcContractAddress_
    ) external onlyGov {
        for (uint256 i = 0; i < btcContractAddress_.length; i++) {
            address btcContractAddress = btcContractAddress_[i];
            if (
                btcContractAddress == address(0) ||
                btcContractAddress == address(0x1)
            ) {
                revert InvalidAddress();
            }
            _btcContractAddressSet.add(btcContractAddress);
            emit BTCContractAddressAdd(btcContractAddress);
        }
    }

    /**
     * @dev remove btc contract address be supported by lorenzo stake plan. eg: WBTC/BTCB/... This function
     * can only be called by the governance address.
     *
     * @param btcContractAddress_ The array address of erc20 btc contract address to set.
     */
    function removeSupportBtcContractAddress(
        address[] memory btcContractAddress_
    ) external onlyGov {
        for (uint256 i = 0; i < btcContractAddress_.length; i++) {
            address btcContractAddress = btcContractAddress_[i];
            if (btcContractAddress == address(0)) {
                revert InvalidAddress();
            }
            _btcContractAddressSet.remove(btcContractAddress);
            emit BTCContractAddressRemove(btcContractAddress);
        }
    }

    /**
     * @dev withdraw erc20 btc from stake plan contract address. This function
     * can only be called by the governance address.
     * revert if stake plan subcription end time not reach.
     *
     * @param planId_ The plan id of stake plan.
     * @param to_ The address to receive erc20 btc.
     */
    function withdrawBTC(uint256 planId_, address to_) external onlyGov {
        address derivedStakePlanAddr = _stakePlanMap[planId_];
        if (derivedStakePlanAddr == address(0)) {
            revert InvalidPlanId();
        }
        if (to_ == address(0)) {
            revert InvalidAddress();
        }
        for (uint256 i = 0; i < _btcContractAddressSet.length(); i++) {
            address btcContractAddress = _btcContractAddressSet.at(i);
            uint256 balance = IStakePlan(derivedStakePlanAddr).withdrawBTC(
                btcContractAddress,
                to_
            );
            emit WithdrawBTC(planId_, to_, btcContractAddress, balance);
        }
    }

    /// ***************************************
    /// *****LorenzoAdmin FUNCTIONS*****
    /// ***************************************

    function adminPauseBridge() external onlyLorenzoAdmin {
        _pause();
    }

    /**
        @notice Unpauses deposits, proposal creation and voting, and deposit executions.
        @notice Only callable by an address that currently has the admin role.
     */
    function adminUnpauseBridge() external onlyLorenzoAdmin {
        _unpause();
    }

    /**
     * @dev create new stake plan, this function can only called by Lorenzo Admin.
     * 1. revert if subscription not suitable.
     *
     * @param vars_ A CreateNewPlanData struct containing the following params:
     *
     * - name: The name of stake plan.
     * - symbol: The symbol of stake plan.
     * - descUri: The desc uri of stake plan.
     * - agentId: The agent id of stake plan.
     * - stakePlanStartTime: The start time of stake plan.
     * - periodTime: The period time of stake plan.
     */
    function createNewPlan(
        DataTypes.CreateNewPlanData calldata vars_
    ) external override whenNotPaused onlyLorenzoAdmin returns (uint256) {
        if (
            block.timestamp >= vars_.stakePlanStartTime || vars_.periodTime == 0
        ) {
            revert InvalidTime();
        }
        return _createNewPlan(vars_);
    }

    function setStakePlanAvailable(
        uint256 planId_,
        bool available_
    ) external override whenNotPaused onlyLorenzoAdmin returns (bool) {
        address derivedStakePlanAddr = _stakePlanMap[planId_];
        if (derivedStakePlanAddr == address(0)) {
            revert InvalidPlanId();
        }
        _stakePlanAvailableMap[planId_] = available_;
        emit SetStakePlanAvailable(planId_, available_);
        return true;
    }

    /// ***************************************
    /// *****EXTERNAL FUNCTIONS*****
    /// ***************************************

    /**
     * @dev user deposit erc20 btc to particpant which stake plan they want.
     *
     * @param planId_ The plan id of stake plan.
     * @param btcContractAddress_ The erc20 btc contract address(WBTC/BTCB).
     * @param stakeAmount The amount of erc20 btc to stake.
     */
    function stakeBTC2JoinStakePlan(
        uint256 planId_,
        address btcContractAddress_,
        uint256 stakeAmount
    ) external override whenNotPaused {
        address derivedStakePlanAddr = _stakePlanMap[planId_];
        if (derivedStakePlanAddr == address(0)) {
            revert InvalidPlanId();
        }
        if (!_btcContractAddressSet.contains(btcContractAddress_)) {
            revert InvalidBTCContractAddress();
        }
        if (_stakePlanAvailableMap[planId_]) {
            revert StakePlanNotAvailable();
        }

        uint decimal = IERC20Metadata(btcContractAddress_).decimals();
        uint256 stBTCAmount = (stakeAmount * (10 ** 18)) / (10 ** decimal);

        IERC20(btcContractAddress_).safeTransferFrom(
            msg.sender,
            derivedStakePlanAddr,
            stakeAmount
        );

        IstBTCMintAuthority(_stBTCMintAuthorityAddress).mint(
            msg.sender,
            stBTCAmount
        );

        IStakePlan(derivedStakePlanAddr).recordStakeStBTC(
            msg.sender,
            stBTCAmount
        );

        emit StakeBTC2JoinStakePlan(
            msg.sender,
            planId_,
            btcContractAddress_,
            stakeAmount,
            stBTCAmount
        );
    }

    /// ***************************************
    /// *****VIEW FUNCTIONS*****
    /// ***************************************
    function getSupportBtcContractAddress()
        external
        view
        returns (address[] memory)
    {
        return _btcContractAddressSet.values();
    }

    /// ***************************************
    /// *****INTERNAL FUNCTIONS*****
    /// ***************************************

    function _createNewPlan(
        DataTypes.CreateNewPlanData calldata vars_
    ) internal returns (uint256) {
        uint256 planId = _stakePlanCounter++;
        address derivedStakePlanAddr = _deployDerivedStakePlan(planId, vars_);
        _stakePlanMap[planId] = derivedStakePlanAddr;

        emit CreateNewPlan(
            planId,
            vars_.agentId,
            derivedStakePlanAddr,
            vars_.stakePlanStartTime,
            vars_.periodTime,
            vars_.name,
            vars_.symbol,
            vars_.descUri
        );
        return planId;
    }

    function _deployDerivedStakePlan(
        uint256 planId_,
        DataTypes.CreateNewPlanData calldata vars_
    ) internal returns (address) {
        address derivedStakePlanAddr = Clones.cloneDeterministic(
            _stakePlanImpl,
            keccak256(abi.encodePacked(planId_))
        );

        IStakePlan(derivedStakePlanAddr).initialize(planId_, vars_);

        return derivedStakePlanAddr;
    }
}
