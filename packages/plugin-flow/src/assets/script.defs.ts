// Source:
//
// This file contains the definitions of the Cadence scripts used in the plugin.
// The scripts are defined as strings and exported as a dictionary.

// Scripts for EVM
import evmCall from "./cadence/scripts/evm/call.cdc?raw";
import evmERC20BalanceOf from "./cadence/scripts/evm/erc20/balance_of.cdc?raw";
import evmERC20GetDecimals from "./cadence/scripts/evm/erc20/get_decimals.cdc?raw";
import evmERC20GetTotalSupply from "./cadence/scripts/evm/erc20/total_supply.cdc?raw";

// Scripts for main account
import mainGetAccountInfo from "./cadence/scripts/main-account/get_acct_info.cdc?raw";

export const scripts = {
    evmCall,
    evmERC20BalanceOf,
    evmERC20GetDecimals,
    evmERC20GetTotalSupply,
    mainGetAccountInfo,
};
