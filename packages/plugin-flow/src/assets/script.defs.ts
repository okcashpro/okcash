// Source:
//
// This file contains the definitions of the Cadence scripts used in the plugin.
// The scripts are defined as strings and exported as a dictionary.

// Scripts for EVM
import evmCall from "./cadence/scripts/evm/call.cdc";
import evmERC20BalanceOf from "./cadence/scripts/evm/erc20/balance_of.cdc";
import evmERC20GetDecimals from "./cadence/scripts/evm/erc20/get_decimals.cdc";
import evmERC20GetTotalSupply from "./cadence/scripts/evm/erc20/total_supply.cdc";

// Scripts for main account
import mainGetAccountInfo from "./cadence/scripts/main-account/get_acct_info.cdc";

export const scripts = {
    evmCall,
    evmERC20BalanceOf,
    evmERC20GetDecimals,
    evmERC20GetTotalSupply,
    mainGetAccountInfo,
};
