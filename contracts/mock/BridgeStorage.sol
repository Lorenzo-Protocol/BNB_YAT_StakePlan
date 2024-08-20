// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

abstract contract BridgeStorage {
    uint256 public _chainId;
    address public _relayerOrDao;
    address public _protocolFeeAddress;
    address public _stBTCMintAuthorityAddress;
    address internal constant NATIVE_TOKEN = address(0x1);

    mapping(bytes32 => bool) public _usedTxid;
    struct stBtcChainInfo {
        address stBTCAddress;
        uint256 cross_chain_fee;
    }
    mapping(uint256 => stBtcChainInfo) public _supportChain;
}
