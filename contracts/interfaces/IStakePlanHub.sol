// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {DataTypes} from "../libraries/DataTypes.sol";

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IStakePlanHub {
    function createNewPlan(
        DataTypes.CreateNewPlanData calldata vars
    ) external returns (uint256);

    function setStakePlanAvailable(
        uint256 planId_,
        bool available_
    ) external returns (bool);

    function stakeBTC2JoinStakePlan(
        uint256 planId_,
        address btcContractAddress_,
        uint256 stakeAmount
    ) external;
}
