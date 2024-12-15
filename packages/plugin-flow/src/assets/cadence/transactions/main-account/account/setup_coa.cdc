import "EVM"
import "FungibleToken"
import "FlowToken"

/// Creates a COA and saves it in the signer's Flow account & passing the given value of Flow into FlowEVM
///
transaction() {

    prepare(signer: auth(BorrowValue, IssueStorageCapabilityController, PublishCapability, SaveValue, UnpublishCapability) &Account) {
        let storagePath = StoragePath(identifier: "evm")!
        let publicPath = PublicPath(identifier: "evm")!

        // Reference signer's COA if one exists
        let coa = signer.storage.borrow<auth(EVM.Withdraw) &EVM.CadenceOwnedAccount>(from: storagePath)
        if coa == nil {
            let coa <- EVM.createCadenceOwnedAccount()
            signer.storage.save<@EVM.CadenceOwnedAccount>(<-coa, to: storagePath)
            let addressableCap = signer.capabilities.storage.issue<&EVM.CadenceOwnedAccount>(storagePath)
            signer.capabilities.unpublish(publicPath)
            signer.capabilities.publish(addressableCap, at: publicPath)
        }
    }
}
