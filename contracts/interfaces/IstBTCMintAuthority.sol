// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IstBTCMintAuthority {
    function mint(address receipt, uint256 value) external;
}
