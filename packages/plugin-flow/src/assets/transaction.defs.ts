import evmCall from "./cadence/transactions/evm/call.cdc";
// Transactions for main account
import mainAccountCreateNewWithCOA from "./cadence/transactions/main-account/account/create_new_account_with_coa.cdc";
import mainAccountSetupCOA from "./cadence/transactions/main-account/account/setup_coa.cdc";
import mainEVMTransferERC20 from "./cadence/transactions/main-account/evm/transfer_erc20.cdc";
import mainFlowTokenDynamicTransfer from "./cadence/transactions/main-account/flow-token/dynamic_vm_transfer.cdc";
import mainFTGenericTransfer from "./cadence/transactions/main-account/ft/generic_transfer_with_address.cdc";

export const transactions = {
    evmCall,
    mainAccountCreateNewWithCOA,
    mainAccountSetupCOA,
    mainEVMTransferERC20,
    mainFlowTokenDynamicTransfer,
    mainFTGenericTransfer,
};
