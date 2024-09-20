// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IStakePlanHub {
    function createNewPlan(uint256 planId_, address custodyAddress_) external;

    function setStakePlanAvailable(
        uint256 planId_,
        bool available_
    ) external returns (bool);

    function stakeBTC2JoinStakePlan(
        uint256 planId_,
        address btcContractAddress_,
        uint256 stakeAmount_
    ) external payable;
}
