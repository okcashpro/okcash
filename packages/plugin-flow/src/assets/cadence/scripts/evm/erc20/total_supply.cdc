import "EVM"

import "FlowEVMBridgeUtils"

/// Retrieves the total supply of the ERC20 contract at the given EVM contract address. Reverts on EVM call failure.
///
/// @param evmContractAddress: The EVM contract address to retrieve the total supply from
///
/// @return the total supply of the ERC20
///
access(all) fun main(evmContractAddressHex: String): UInt256 {
    return FlowEVMBridgeUtils.totalSupply(
        evmContractAddress: EVM.addressFromString(evmContractAddressHex)
    )
}
