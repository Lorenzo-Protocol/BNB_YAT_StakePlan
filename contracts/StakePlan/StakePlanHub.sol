// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC20Metadata, IERC20} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStakePlanHub} from "../interfaces/IStakePlanHub.sol";
import {StakePlanHubStorage} from "../storage/StakePlanHubStorage.sol";
import {IstBTCMintAuthority} from "../interfaces/IstBTCMintAuthority.sol";

/**
 * @title StakePlanHub
 * @author Leven
 *
 * @dev This is the main entrypoint of Lorenzo Stake Plan. It contains governance functionality as well as
 * create new stake plan by lorenzo admin and stakers stake btc & withdraw stBTC functionality.
 *
 * NOTE: StakePlanHub is used to create new stake plan by Lorenzo Admin, and then user can stake BTC(ERC20), eg: WBTC/BTCB to participant in the stake plan.
 *      1. user can stake erc20 btc token to join a stake plan after stake plan available. will get stBTC and YAT token.
 *      2. Lorenzo will withdraw all erc20 btc and convert to native btc, then stake to Babylon protocol, user can claim reward by YAT in future.
 *
 */
contract StakePlanHub is
    IStakePlanHub,
    PausableUpgradeable,
    StakePlanHubStorage
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeERC20 for IERC20;

    address public constant NATIVE_TOKEN = address(0x1);

    error NoPermission();
    error InvalidParam();
    error InvalidAddress();
    error InvalidBTCContractAddress();
    error StakePlanNotAvailable();
    error SendETHFailed();

    event Initialize(
        address indexed gov,
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

    event SetStakePlanAvailable(uint256 indexed planId, bool available);

    event CreateNewPlan(uint256 indexed planId, address indexed custodyAddress);

    event StakeBTC2JoinStakePlan(
        uint256 indexed stakeIndex,
        uint256 indexed planId,
        address indexed user,
        address btcContractAddress,
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
     * @dev Initializes the YATStakePlanHub, setting the initial gov_/lorenzoAdmin_/mintstBTCAuthorityAddress_.
     *
     * @param gov_ The governance address to set.
     * @param lorenzoAdmin_ The lorenzo admin address to set.
     * @param stBTCMintAuthorityAddress_ The mint stBTC authority address to set.
     */
    function initialize(
        address gov_,
        address lorenzoAdmin_,
        address stBTCMintAuthorityAddress_
    ) external initializer {
        if (
            gov_ == address(0) ||
            lorenzoAdmin_ == address(0) ||
            stBTCMintAuthorityAddress_ == address(0)
        ) {
            revert InvalidAddress();
        }
        __Pausable_init();
        _governance = gov_;
        _lorenzoAdmin = lorenzoAdmin_;
        _stBTCMintAuthorityAddress = stBTCMintAuthorityAddress_;

        emit Initialize(_governance, _lorenzoAdmin, stBTCMintAuthorityAddress_);
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

    /// ***************************************
    /// *****LorenzoAdmin FUNCTIONS*****
    /// ***************************************

    function adminPause() external onlyLorenzoAdmin {
        _pause();
    }

    /**
        @notice Unpauses deposits, proposal creation and voting, and deposit executions.
        @notice Only callable by an address that currently has the admin role.
     */
    function adminUnpause() external onlyLorenzoAdmin {
        _unpause();
    }

    /**
     * @dev create new stake plan, this function can only called by Lorenzo Admin.
     *
     * @param planId_: The id of stake plan.
     * @param custodyAddress_: The custody address of stake plan.
     */
    function createNewPlan(
        uint256 planId_,
        address custodyAddress_
    ) external override whenNotPaused onlyLorenzoAdmin {
        _stakePlanAvailableMap[planId_] = true;
        _stakePlanCustodyAddress_[planId_] = custodyAddress_;
        emit CreateNewPlan(planId_, custodyAddress_);
    }

    /**
     * @dev set stake plan available, this function can only called by Lorenzo Admin.
     * open or close stake plan.
     *
     * @param planId_: The planId_ of stake plan.
     * @param avaiable_: true or false.
     */
    function setStakePlanAvailable(
        uint256 planId_,
        bool avaiable_
    ) external override whenNotPaused onlyLorenzoAdmin returns (bool) {
        _stakePlanAvailableMap[planId_] = avaiable_;
        emit SetStakePlanAvailable(planId_, avaiable_);
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
     * @param stakeAmount_ The amount of erc20 btc to stake.
     */
    function stakeBTC2JoinStakePlan(
        uint256 planId_,
        address btcContractAddress_,
        uint256 stakeAmount_
    ) external payable override whenNotPaused {
        if (!_btcContractAddressSet.contains(btcContractAddress_)) {
            revert InvalidBTCContractAddress();
        }
        if (!_stakePlanAvailableMap[planId_]) {
            revert StakePlanNotAvailable();
        }
        if (stakeAmount_ == 0) {
            revert InvalidParam();
        }

        uint256 stBTCAmount;
        address custodyAddress = _stakePlanCustodyAddress_[planId_];
        if (btcContractAddress_ == NATIVE_TOKEN) {
            if (msg.value != stakeAmount_) {
                revert InvalidParam();
            }
            stBTCAmount = stakeAmount_;
            (bool suc, ) = payable(custodyAddress).call{value: stakeAmount_}(
                ""
            );
            if (!suc) {
                revert SendETHFailed();
            }
        } else {
            uint decimal = IERC20Metadata(btcContractAddress_).decimals();
            stBTCAmount = (stakeAmount_ * (10 ** 18)) / (10 ** decimal);

            //transfer BTCB to custody address
            IERC20(btcContractAddress_).safeTransferFrom(
                msg.sender,
                custodyAddress,
                stakeAmount_
            );
        }

        //mint stBTC
        IstBTCMintAuthority(_stBTCMintAuthorityAddress).mint(
            msg.sender,
            stBTCAmount
        );

        uint256 stakeIndex = _stakeIndex++;
        emit StakeBTC2JoinStakePlan(
            stakeIndex,
            planId_,
            msg.sender,
            btcContractAddress_,
            stakeAmount_,
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
}
