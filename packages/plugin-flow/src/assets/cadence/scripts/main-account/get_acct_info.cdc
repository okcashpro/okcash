import "FungibleToken"
import "EVM"

/// Returns the hex encoded address of the COA in the given Flow address
///
access(all) fun main(flowAddress: Address): AccountInfo {
    var flowBalance: UFix64 = 0.0
    if let flowVaultRef = getAccount(flowAddress)
        .capabilities.get<&{FungibleToken.Balance}>(/public/flowTokenBalance)
        .borrow() {
        flowBalance = flowVaultRef.balance
    }

    var coaAddress: String? = nil
    var coaBalance: UFix64? = nil

    if let address: EVM.EVMAddress = getAuthAccount<auth(BorrowValue) &Account>(flowAddress)
        .storage.borrow<&EVM.CadenceOwnedAccount>(from: /storage/evm)?.address() {
        let bytes: [UInt8] = []
        for byte in address.bytes {
            bytes.append(byte)
        }
        coaAddress = String.encodeHex(bytes)
        coaBalance = address.balance().inFLOW()
    }
    return AccountInfo(
        flowAddress,
        flowBalance,
        coaAddress,
        coaBalance
    )
}

access(all) struct AccountInfo {
    access(all) let address: Address
    access(all) let balance: UFix64
    access(all) let coaAddress: String?
    access(all) let coaBalance: UFix64?

    init(
        _ address: Address,
        _ balance: UFix64,
        _ coaAddress: String?,
        _ coaBalance: UFix64?
    ) {
        self.address = address
        self.balance = balance
        self.coaAddress = coaAddress
        self.coaBalance = coaBalance
    }
}
