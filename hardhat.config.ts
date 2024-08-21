import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from 'dotenv'
import 'hardhat-deploy'
dotenv.config()

const stBTC_deployer = process.env.STBTC_DEPLOY_PRIVATE_KEY || '0x' + '11'.repeat(32)
const bridge_deployer = process.env.BRIDGE_DEPLOY_PRIVATE_KEY || '0x' + '11'.repeat(32)
const stake_planer = process.env.STAKE_PLAN_PRIVATE_KEY || '0x' + '11'.repeat(32)

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      gas: 29000000,
    },
    bsc_testnet: {
      chainId: 97,
      url: process.env.BSC_TESTNET_RPC_URL || '',
      accounts: [bridge_deployer, stBTC_deployer, stake_planer],
    },
    bsc: {
      chainId: 56,
      url: process.env.BSC_MAINNET_RPC_URL || '',
      accounts: [bridge_deployer, stBTC_deployer, stake_planer],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    stBTC_deployer: {
      default: 1,
    },
    stake_planer: {
      default: 2,
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSC_SCAN_API_KEY || ' ',
      bsc: process.env.BSC_SCAN_API_KEY || ' ',
    }
  }
};

export default config;