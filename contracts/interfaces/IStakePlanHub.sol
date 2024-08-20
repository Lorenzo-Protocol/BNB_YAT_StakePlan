// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IStakePlanHub {
    function createNewPlan(
        string memory name_,
        string memory symbol_,
        address custodyAddress_,
        uint256 stakePlanStartTime_
    ) external returns (uint256);

    function setStakePlanAvailable(
        uint256 planId_,
        bool available_
    ) external returns (bool);

    function stakeBTC2JoinStakePlan(
        uint256 planId_,
        address btcContractAddress_,
        uint256 stakeAmount_
    ) external;

    function setMerkleRoot(uint256 planId_, bytes32 newMerkleRoot_) external;

    function mintYATFromLorenzo(
        uint256 planId_,
        address[] calldata account_,
        uint256[] calldata yatAmount_,
        bytes32[] calldata hash_
    ) external;
}
