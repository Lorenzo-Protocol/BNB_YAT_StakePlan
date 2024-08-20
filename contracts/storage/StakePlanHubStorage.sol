// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract StakePlanHubStorage {
    address public _lorenzoAdmin;
    address public _stBTCMintAuthorityAddress;
    address public _governance;

    EnumerableSet.AddressSet internal _btcContractAddressSet;
    mapping(uint256 => address) public _stakePlanMap;
    mapping(uint256 => address) public _stakePlanCustodyAddress_;
    mapping(uint256 => bool) public _stakePlanAvailableMap;
    mapping(bytes32 => bool) public _hashUsedMap;

    uint256 public _stakePlanCounter;
}
