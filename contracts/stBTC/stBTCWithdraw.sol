// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20MintBurnable} from "../interfaces/IERC20MintBurnable.sol";

/**
 * @title stBTCWithdraw
 * @author Leven
 *
 * @notice This is the contract for who want to withdraw stBTC and quit from the Lorenzo Protocol. Each withdrawl need wait for 14 days, cause we need to unbond the native btc asset from the Babylon.
 *
 */

contract stBTCWithdraw is Ownable, Pausable {
    error NotReveivedStBTC();
    error InvalidAmount();
    error InvalidBtcType();
    error SendETHFailed();
    error InvalidParams();

    event DepositStBTC2Quit(
        address indexed sender,
        uint256 indexed btcType,
        uint256 amount,
        uint256 withdrawTimeStamp,
        uint256 refundTimeStamp,
        string btcTypeName
    );

    event EpochTimePeriodSet(
        uint256 preEpochTimePeriod,
        uint256 newEpochTimePeriod
    );

    address immutable STBTCADDRESS;

    mapping(uint256 => string) private _btcTypes; // btcType => btcTypeName
    uint256 private _epochTimePeriod;

    /**
     *
     * @param owner_ the owner of this contract
     */
    constructor(address owner_, address stBtcAddress_) Ownable(owner_) {
        _epochTimePeriod = 14 days;
        STBTCADDRESS = stBtcAddress_;
    }

    /**
     * @notice send stBTC to this contract for quit lorenzo protocol
     */
    receive() external payable {
        revert NotReveivedStBTC();
    }

    /**
     * @dev send stBTC to this contract for quit lorenzo protocol, and specify the type of BTC(Naitve btc/WBTC/BTCB)
     *
     * @param btcType_ specify the type of BTC(Naitve btc/WBTC/BTCB)
     * @param amount_ the amount of stBTC
     */
    function depositStBTC2Quit(
        uint256 btcType_,
        uint256 amount_
    ) external whenNotPaused {
        if (amount_ == 0) {
            revert InvalidAmount();
        }
        if (bytes(_btcTypes[btcType_]).length == 0) {
            revert InvalidBtcType();
        }

        IERC20MintBurnable(STBTCADDRESS).burnFrom(msg.sender, amount_);

        emit DepositStBTC2Quit(
            msg.sender,
            btcType_,
            amount_,
            block.timestamp,
            block.timestamp + _epochTimePeriod,
            _btcTypes[btcType_]
        );
    }

    /**
     * @notice deposit stBTC to this contract for quit lorenzo protocol
     *
     * @param btcType A unique identifier for the type of BTC(1: native btc, 2: BNB_WBTC, 3: BNB_BTCB.)
     * @param btcTypeName the name of the BTC type
     */
    function setSupportedBtcType(
        uint256 btcType,
        string memory btcTypeName
    ) external onlyOwner {
        _btcTypes[btcType] = btcTypeName;
    }

    function setEpochTimePeriod(uint256 newEpochTimePeriod) external onlyOwner {
        if (newEpochTimePeriod == 0) {
            revert InvalidParams();
        }
        uint256 preEpochTimePeriod = _epochTimePeriod;
        _epochTimePeriod = newEpochTimePeriod;
        emit EpochTimePeriodSet(preEpochTimePeriod, newEpochTimePeriod);
    }

    function paused4Emergece() public onlyOwner {
        _pause();
    }

    function unpaused() public onlyOwner {
        _unpause();
    }

    //************************************** */
    //*************GET FUNCTION **************/
    //************************************* */

    function btcTypes(uint256 btcType_) external view returns (string memory) {
        return _btcTypes[btcType_];
    }

    function epochTimePeriod() external view returns (uint256) {
        return _epochTimePeriod;
    }
}
