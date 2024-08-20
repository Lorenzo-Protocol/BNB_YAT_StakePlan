// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/IERC20.sol)

pragma solidity 0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20MintBurnable {
    function mint(address receipt, uint256 value) external;

    function burnFrom(address account, uint256 value) external;
}
