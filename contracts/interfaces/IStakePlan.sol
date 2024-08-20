// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;
import {DataTypes} from "../libraries/DataTypes.sol";

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IStakePlan {
    function initialize(
        uint256 planId_,
        DataTypes.CreateNewPlanData calldata vars_
    ) external;

    function recordStakeStBTC(address staker_, uint256 amount_) external;

    function withdrawBTC(
        address btcContractAddress,
        address withdrawer
    ) external returns (uint256);
}
