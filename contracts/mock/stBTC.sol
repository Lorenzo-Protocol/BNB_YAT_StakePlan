// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Bridge
 * @author Leven
 *
 * @notice This is the lorenzo stBTC ERC20 contract which deployed on the other evm chain
 *
 */
contract stBTC is ERC20Burnable, Ownable {
    error InvalidMinter(address receiver);
    error InvalidAddress();

    event MinterContractSet(address preMinterContract, address minterContract);

    address public _minter_contract;

    constructor() ERC20("Lorenzo stBTC", "stBTC") Ownable(msg.sender) {}

    modifier onlyMinterContract() {
        if (msg.sender != _minter_contract) {
            revert InvalidMinter(msg.sender);
        }
        _;
    }

    /**
     * @dev set which contract can have right to mint stBTC
     *
     * revert if zero address
     *
     * @param newMinterContract the address of minter contract.
     */
    function setNewMinterContract(
        address newMinterContract
    ) external onlyOwner returns (bool) {
        if (newMinterContract == address(0x0)) {
            revert InvalidAddress();
        }
        address preMinterAddress = _minter_contract;
        _minter_contract = newMinterContract;
        emit MinterContractSet(preMinterAddress, newMinterContract);
        return true;
    }

    function mint(address receipt, uint256 amount) external onlyMinterContract {
        _mint(receipt, amount);
    }
}
