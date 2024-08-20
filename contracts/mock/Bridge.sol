// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {BridgeStorage} from "./BridgeStorage.sol";
import {IERC20MintBurnable} from "../interfaces/IERC20MintBurnable.sol";
import {IstBTCMintAuthority} from "../interfaces/IstBTCMintAuthority.sol";

/**
 * @title Bridge
 * @author Leven
 *
 * @notice This is the Bridge contract for stBTC. user can bridge their stBTC to lorenzo, and lorenzo native stBtc also can bridge to other evm chain
 *
 */
contract Bridge is
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    OwnableUpgradeable,
    BridgeStorage
{
    error InvalidParams();
    error InvalidAddress();
    error InvalidAmount();
    error NoPermission();
    error TxHashAlreadyMint();
    error InvalidToChainId();
    error InvalidFromChainId();
    error InvalidNativeTokenAmount();
    error SendETHFailed();
    error InvalidReceiver();

    event Mint(
        address fromStBtcAddress,
        address toStBtcAddress,
        address to,
        uint256 fromChainId,
        uint256 toChainId,
        uint256 amount,
        bytes32 txHash
    );
    event Burn(
        address from,
        uint256 amount,
        uint256 fromChainId,
        uint256 toChainId,
        address fromStBtcAddress,
        address toStBtcAddress,
        address receiver
    );

    event SetSupportStBTCInfo(
        uint256 chainId,
        uint256 fee,
        address stBtcAddress
    );

    event ProtocolFeeAddressSet(
        address preProtocolFeeAddress,
        address newProtocolFeeAddress
    );

    event RelayerOrDaoSet(address preRelayerOrDao, address newRelayerOrDao);

    modifier onlyAuthRelayerOrDaoContract() {
        if (msg.sender != _relayerOrDao) {
            revert NoPermission();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    receive() external payable {
        if (msg.value == 0) {
            revert InvalidNativeTokenAmount();
        }
    }

    /**
     * @dev initialize the upgradeable Bridge contract.
     *
     * revert if zero address
     *
     * @param owner the owner of this contract.
     * @param relayerOrDao the relayer of bridge which can mint/burn stBTC
     * @param protocolFeeAddress the fee address
     * @param stBTCMintAuthorityAddress the contract which have authority to mint stBTC
     */
    function initialize(
        address owner,
        address relayerOrDao,
        address protocolFeeAddress,
        address stBTCMintAuthorityAddress
    ) external initializer {
        __Pausable_init();
        __ReentrancyGuard_init();
        __Ownable_init(owner);
        if (
            owner == address(0x0) ||
            relayerOrDao == address(0x0) ||
            protocolFeeAddress == address(0x0) ||
            stBTCMintAuthorityAddress == address(0x0)
        ) {
            revert InvalidAddress();
        }
        _relayerOrDao = relayerOrDao;
        _protocolFeeAddress = protocolFeeAddress;
        _stBTCMintAuthorityAddress = stBTCMintAuthorityAddress;

        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        _chainId = chainId;

        emit RelayerOrDaoSet(address(0x0), _relayerOrDao);
        emit ProtocolFeeAddressSet(address(0x0), _protocolFeeAddress);
    }

    /**
     * @dev mint or unstake stBTC for user who already burn or stake stBTC on other evm chain.
     *
     * revert if zero address
     *
     * @param to the adress of receiver.
     * @param fromChainId the chainid of bridge from
     * @param toChainId must be current chainid
     * @param amount the bridge amount
     * @param txHash the tx hash of stake stBTC on other evm chain
     */
    function mintOrUnstakeStBtc(
        address to,
        uint256 fromChainId,
        uint256 toChainId,
        uint256 amount,
        bytes32 txHash
    ) external onlyAuthRelayerOrDaoContract whenNotPaused nonReentrant {
        if (to == address(0x0)) {
            revert InvalidReceiver();
        }
        address fromStBtcAddress = _supportChain[fromChainId].stBTCAddress;
        if (fromStBtcAddress == address(0x0)) {
            revert InvalidFromChainId();
        }
        if (toChainId != _chainId) {
            revert InvalidToChainId();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (_usedTxid[txHash]) {
            revert TxHashAlreadyMint();
        }

        _usedTxid[txHash] = true;
        address stBTCAddress = _supportChain[_chainId].stBTCAddress;

        if (stBTCAddress == NATIVE_TOKEN) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) {
                revert SendETHFailed();
            }
        } else if (stBTCAddress != address(0x0)) {
            IstBTCMintAuthority(_stBTCMintAuthorityAddress).mint(to, amount);
        }

        emit Mint(
            fromStBtcAddress,
            stBTCAddress,
            to,
            fromChainId,
            toChainId,
            amount,
            txHash
        );
    }

    /**
     * @dev for user who want bridge stBTC to other evm chain.
     *
     * revert if zero address
     *
     * @param amount the bridge amount
     * @param toChainId the chainid of destination chain
     * @param receiver the receiver address in destination chain
     */
    function burnOrStakeStBtc(
        uint256 amount,
        uint256 toChainId,
        address receiver
    ) external payable whenNotPaused nonReentrant {
        if (receiver == address(0x0)) {
            revert InvalidReceiver();
        }
        if (amount == 0) {
            revert InvalidAmount();
        }
        uint256 cross_chain_fee = _supportChain[toChainId].cross_chain_fee;
        if (cross_chain_fee == 0 || toChainId == _chainId) {
            revert InvalidToChainId();
        }
        address stBTCAddress = _supportChain[_chainId].stBTCAddress;
        if (stBTCAddress == address(0x0)) {
            revert InvalidFromChainId();
        }

        if (_supportChain[_chainId].stBTCAddress == NATIVE_TOKEN) {
            if (msg.value != amount + cross_chain_fee) {
                revert InvalidNativeTokenAmount();
            }
        } else {
            if (msg.value != cross_chain_fee) {
                revert InvalidNativeTokenAmount();
            }
            IERC20MintBurnable(stBTCAddress).burnFrom(msg.sender, amount);
        }

        (bool success, ) = payable(_protocolFeeAddress).call{
            value: cross_chain_fee
        }("");
        if (!success) {
            revert SendETHFailed();
        }

        emit Burn(
            msg.sender,
            amount,
            _chainId,
            toChainId,
            stBTCAddress,
            _supportChain[toChainId].stBTCAddress,
            receiver
        );
    }

    /* *****************Only Owner********************
     */

    function setSupportChainId(
        uint256[] memory chainIds,
        stBtcChainInfo[] memory stBtcChainInfos
    ) public onlyOwner {
        if (chainIds.length == 0 || chainIds.length != stBtcChainInfos.length) {
            revert InvalidParams();
        }
        for (uint256 i = 0; i < chainIds.length; ) {
            if (
                chainIds[i] == 0 ||
                stBtcChainInfos[i].stBTCAddress == address(0x0) ||
                stBtcChainInfos[i].cross_chain_fee == 0
            ) {
                revert InvalidParams();
            }
            _supportChain[chainIds[i]] = stBtcChainInfos[i];
            emit SetSupportStBTCInfo(
                chainIds[i],
                stBtcChainInfos[i].cross_chain_fee,
                stBtcChainInfos[i].stBTCAddress
            );
            unchecked {
                i++;
            }
        }
    }

    function adminPauseBridge() external onlyOwner {
        _pause();
    }

    /**
        @notice Unpauses deposits, proposal creation and voting, and deposit executions.
        @notice Only callable by an address that currently has the admin role.
     */
    function adminUnpauseBridge() external onlyOwner {
        _unpause();
    }

    function changeRelayer(address newRelayer) external onlyOwner {
        address preRelayerOrDao = _relayerOrDao;
        if (newRelayer == address(0x0)) {
            revert InvalidParams();
        }
        _relayerOrDao = newRelayer;
        emit RelayerOrDaoSet(preRelayerOrDao, _relayerOrDao);
    }

    function changeProtocolFeeAddress(
        address newProtocolFeeAddress
    ) external onlyOwner {
        address preProtocolFeeAddress = _protocolFeeAddress;
        if (newProtocolFeeAddress == address(0x0)) {
            revert InvalidParams();
        }
        _protocolFeeAddress = newProtocolFeeAddress;
        emit ProtocolFeeAddressSet(preProtocolFeeAddress, _protocolFeeAddress);
    }
}
