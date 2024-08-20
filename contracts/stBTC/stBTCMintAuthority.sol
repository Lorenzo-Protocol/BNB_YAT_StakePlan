// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20MintBurnable} from "../interfaces/IERC20MintBurnable.sol";
import {IstBTCMintAuthority} from "../interfaces/IstBTCMintAuthority.sol";

/**
 * @title stBTCMintAuthority
 * @author Leven
 *
 * @notice This is the contract which has the mint authority to mint stBTC, and can add MINTER_ROLE to some other contract address. eg: Bridge & StakePlanHub contract.
 *
 */
contract stBTCMintAuthority is AccessControl, IstBTCMintAuthority {
    error InvalidParams();

    bytes32 public constant MINTER_ROLE = keccak256("STBTC_MINTER_ROLE");
    address immutable _stBTCAddress;

    constructor(address stBTCAddress, address admin) {
        if (stBTCAddress == address(0x0)) {
            revert InvalidParams();
        }
        _stBTCAddress = stBTCAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(
        address receipt,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        _mint(receipt, amount);
    }

    function setMinter(address minter) external {
        grantRole(MINTER_ROLE, minter);
    }

    function removeMinter(address minter) external {
        revokeRole(MINTER_ROLE, minter);
    }

    function _mint(address receipt, uint256 amount) private {
        IERC20MintBurnable(_stBTCAddress).mint(receipt, amount);
    }
}
