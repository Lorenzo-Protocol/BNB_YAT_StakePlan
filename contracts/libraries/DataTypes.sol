// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library DataTypes {
    struct CreateNewPlanData {
        string name;
        string symbol;
        string descUri;
        uint256 agentId;
        uint256 stakePlanStartTime;
        uint256 periodTime;
    }
}
