// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IStakePlan {
    function mintYAT(address staker_, uint256 amount_) external;

    function setMerkleRoot(uint256 roundId_, bytes32 newMerkleRoot_) external;
}
