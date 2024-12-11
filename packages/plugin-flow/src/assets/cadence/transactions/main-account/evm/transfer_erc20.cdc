import "EVM"

import "FlowEVMBridgeUtils"

/// Executes a token transfer to the defined recipient address against the specified ERC20 contract.
///
transaction(evmContractAddressHex: String, recipientAddressHex: String, amount: UInt256) {

    let evmContractAddress: EVM.EVMAddress
    let recipientAddress: EVM.EVMAddress
    let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount
    let preBalance: UInt256
    var postBalance: UInt256

    prepare(signer: auth(BorrowValue) &Account) {
        self.evmContractAddress = EVM.addressFromString(evmContractAddressHex)
        self.recipientAddress = EVM.addressFromString(recipientAddressHex)

        self.coa = signer.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(from: /storage/evm)
            ?? panic("Could not borrow CadenceOwnedAccount reference")

        self.preBalance = FlowEVMBridgeUtils.balanceOf(owner: self.coa.address(), evmContractAddress: self.evmContractAddress)
        self.postBalance = 0
    }

    execute {
        let calldata = EVM.encodeABIWithSignature("transfer(address,uint256)", [self.recipientAddress, amount])
        let callResult = self.coa.call(
            to: self.evmContractAddress,
            data: calldata,
            gasLimit: 15_000_000,
            value: EVM.Balance(attoflow: 0)
        )
        assert(callResult.status == EVM.Status.successful, message: "Call to ERC20 contract failed")
        self.postBalance = FlowEVMBridgeUtils.balanceOf(owner: self.coa.address(), evmContractAddress: self.evmContractAddress)
    }

    post {
        self.postBalance == self.preBalance - amount: "Transfer failed"
    }
}
