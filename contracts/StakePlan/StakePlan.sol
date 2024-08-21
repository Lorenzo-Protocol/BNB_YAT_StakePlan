// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IStakePlan} from "../interfaces/IStakePlan.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title StakePlan
 * @author Leven
 *
 * @notice This is StakePlan YAT contract. It contains all the infomation of YAT as well as
 * receive erc20 btc by Lorenzo.
 *
 * NOTE: all of functions can only called by StakePlanHub contract.
 *
 */
contract StakePlan is IStakePlan, ERC20 {
    error EmptyMerkleRoot();
    error NotYATHub();
    error AlreadyClaimed();
    error InvalidMerkleProof();
    error PlanNotStart();
    error InvalidParams();

    event ClaimYATToken(
        uint256 indexed planId,
        uint256 indexed roundId,
        address indexed account,
        uint256 amount
    );
    event MerkleRootSet(
        uint256 indexed planId,
        uint256 indexed roundId,
        bytes32 merkleRoot
    );

    uint256 public _planId;
    uint256 public _stakePlanStartTime;
    uint256 public _roundId;

    address public STAKE_PLAN_HUB;

    mapping(uint256 => mapping(bytes32 => bool)) private _claimLeafNode; // claim leaf node
    mapping(uint256 => bytes32) private _merkleRoot; //merkle root for claim YAT token

    /**
     * @dev This modifier reverts if the caller is not the stake plan hub contract.
     */
    modifier onlyHub() {
        if (msg.sender != STAKE_PLAN_HUB) {
            revert NotYATHub();
        }
        _;
    }

    /**
     * @dev The constructor sets YAT name & symbol and recoed the stake hub address.
     *
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 planId_,
        uint256 stakePlanStartTime_
    ) ERC20(name_, symbol_) {
        _planId = planId_;
        _stakePlanStartTime = stakePlanStartTime_;
        STAKE_PLAN_HUB = msg.sender;
    }

    /**
     * @dev mint yat to staker.
     *
     * only call from stake plan hub contract.
     *
     * @param staker_ the address of staker.
     * @param amount_ the amount of YAT can claim.
     */
    function mintYAT(address staker_, uint256 amount_) external onlyHub {
        if (block.timestamp < _stakePlanStartTime) {
            revert PlanNotStart();
        }
        _mint(staker_, amount_);
    }

    function setMerkleRoot(
        uint256 roundId_,
        bytes32 newMerkleRoot_
    ) external onlyHub {
        if (newMerkleRoot_ == bytes32(0)) {
            revert EmptyMerkleRoot();
        }
        if (_roundId != roundId_) {
            revert InvalidParams();
        }
        uint256 roundId = _roundId++;
        _merkleRoot[roundId] = newMerkleRoot_;
        emit MerkleRootSet(_planId, roundId, newMerkleRoot_);
    }

    /**
     * @dev for user to claim YAT token
     *
     * @param account_ claim YAT token account
     * @param roundId_ claim round id
     * @param amount_ claim YAT token amount
     * @param merkleProof_ merkle proof
     */
    function claimYATToken(
        address account_,
        uint256 roundId_,
        uint256 amount_,
        bytes32[] calldata merkleProof_
    ) external returns (bool) {
        if (_merkleRoot[roundId_] == bytes32(0)) {
            revert EmptyMerkleRoot();
        }
        //bytes32 leafNode = keccak256(abi.encodePacked(account_, amount_));
        bytes32 leafNode = keccak256(
            bytes.concat(keccak256(abi.encode(account_, amount_)))
        );
        if (_claimLeafNode[roundId_][leafNode]) {
            revert AlreadyClaimed();
        }
        if (
            !MerkleProof.verify(merkleProof_, _merkleRoot[roundId_], leafNode)
        ) {
            revert InvalidMerkleProof();
        }
        _claimLeafNode[roundId_][leafNode] = true;
        _mint(account_, amount_);
        emit ClaimYATToken(_planId, roundId_, account_, amount_);
        return true;
    }
}
