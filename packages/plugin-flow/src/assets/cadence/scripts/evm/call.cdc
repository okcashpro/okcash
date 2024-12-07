import "EVM"

access(all) fun getTypeArray(_ identifiers: [String]): [Type] {
    var types: [Type] = []
    for identifier in identifiers {
        let type = CompositeType(identifier)
            ?? panic("Invalid identifier: ".concat(identifier))
        types.append(type)
    }
    return types
}

/// Supports generic calls to EVM contracts that might have return values
///
access(all) fun main(
    gatewayAddress: Address,
    evmContractAddressHex: String,
    calldata: String,
    gasLimit: UInt64,
    typeIdentifiers: [String]
): [AnyStruct] {

    let evmAddress = EVM.addressFromString(evmContractAddressHex)

    let data = calldata.decodeHex()

    let gatewayCOA = getAuthAccount<auth(BorrowValue) &Account>(gatewayAddress)
        .storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(
            from: /storage/evm
        ) ?? panic("Could not borrow COA from provided gateway address")

    let evmResult = gatewayCOA.call(
        to: evmAddress,
        data: data,
        gasLimit: gasLimit,
        value: EVM.Balance(attoflow: 0)
    )

    return EVM.decodeABI(types: getTypeArray(typeIdentifiers), data: evmResult.data)
}
