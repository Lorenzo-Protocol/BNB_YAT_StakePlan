// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IStakePlan} from "../interfaces/IStakePlan.sol";
import {DataTypes} from "../libraries/DataTypes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StakePlan
 * @author Leven
 *
 * @notice This is StakePlan Implement contract. It contains all the infomation of stake plan as well as
 * receive erc20 btc and withdraw by Lorenzo and for user to claim stBTC functionality.
 *
 * NOTE: all of functions can only called by StakePlanHub contract.
 *
 */
contract StakePlan is IStakePlan {
    using SafeERC20 for IERC20;

    error Initialized();
    error InitParamsInvalid();
    error NotYATHub();
    error CanNotStakeBeforeStartTime();

    string public _name;
    string public _symbol;
    string public _descUri;
    uint256 public _planId;
    uint256 public _agentId;
    uint256 public _stakePlanStartTime;
    uint256 public _periodTime;
    uint256 public _nextRewardReceiveTime;

    mapping(address => uint) public _userStakeInfo;
    uint256 public _totalRaisedStBTC;

    bool private _initialized;

    address public immutable STAKE_PLAN_HUB;

    /**
     * @dev This modifier reverts if the caller is not the stake plan hub contract.
     */
    modifier onlyHub() {
        if (msg.sender != STAKE_PLAN_HUB) {
            revert NotYATHub();
        }
        _;
    }

    /**
     * @dev The constructor sets the immutable stake plan hub & stbtc contract address.
     *
     * @param stakePlanHub_ The stake plan contract address.
     */
    constructor(address stakePlanHub_) {
        if (stakePlanHub_ == address(0)) revert InitParamsInvalid();
        STAKE_PLAN_HUB = stakePlanHub_;
        _initialized = true;
    }

    /**
     * @dev Initializes the follow NFT, setting the hub as the privileged minter and storing the associated profile ID.
     *
     * @param planId_ The plan id of stake plan.
     * @param vars_ A CreateNewPlanData struct.
     */
    function initialize(
        uint256 planId_,
        DataTypes.CreateNewPlanData calldata vars_
    ) external override {
        if (_initialized) revert Initialized();
        _initialized = true;
        _planId = planId_;

        _name = vars_.name;
        _symbol = vars_.symbol;
        _descUri = vars_.descUri;
        _agentId = vars_.agentId;
        _stakePlanStartTime = vars_.stakePlanStartTime;
        _periodTime = vars_.periodTime;
        _nextRewardReceiveTime = _stakePlanStartTime + _periodTime;
    }

    /**
     * @dev record how many stBTC each staker can claim after the stake plan subscription end.
     *
     * revert if the blocktime is not between start and end time of this stake plan.
     *
     * @param staker_ the address of staker.
     * @param amount_ the amount of stBTC staker can claim.
     */
    function recordStakeStBTC(
        address staker_,
        uint256 amount_
    ) external onlyHub {
        if (block.timestamp < _stakePlanStartTime) {
            revert CanNotStakeBeforeStartTime();
        }
        if (block.timestamp > _nextRewardReceiveTime) {
            _nextRewardReceiveTime = _nextRewardReceiveTime + _periodTime;
        }
        _userStakeInfo[staker_] += amount_;
        _totalRaisedStBTC += amount_;
    }

    /**
     * @dev withdraw erc20 btc from this stake plan contract.
     *
     * revert if subscription of stake plan not finished.
     *
     * @param btcContractAddress the erc20 btc contract address(WBTC/BTCB/...).
     * @param withdrawer the address which receive erc20 btc.
     */
    function withdrawBTC(
        address btcContractAddress,
        address withdrawer
    ) external onlyHub returns (uint256) {
        uint256 balance = IERC20(btcContractAddress).balanceOf(address(this));
        if (balance > 0) {
            IERC20(btcContractAddress).safeTransfer(withdrawer, balance);
        }
        return balance;
    }
}
