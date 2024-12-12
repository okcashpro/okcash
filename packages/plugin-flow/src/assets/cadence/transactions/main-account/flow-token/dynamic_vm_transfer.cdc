import "FungibleToken"
import "FlowToken"

import "EVM"

// Transfers $FLOW from the signer's account to the recipient's address, determining the target VM based on the format
// of the recipient's hex address. Note that the sender's funds are sourced by default from the target VM, pulling any
// difference from the alternate VM if available. e.g. Transfers to Flow addresses will first attempt to withdraw from
// the signer's Flow vault, pulling any remaining funds from the signer's EVM account if available. Transfers to EVM
// addresses will first attempt to withdraw from the signer's EVM account, pulling any remaining funds from the signer's
// Flow vault if available. If the signer's balance across both VMs is insufficient, the transaction will revert.
///
/// @param addressString: The recipient's address in hex format - this should be either an EVM address or a Flow address
/// @param amount: The amount of $FLOW to transfer as a UFix64 value
///
transaction(addressString: String, amount: UFix64) {

    let sentVault: @FlowToken.Vault
    let evmRecipient: EVM.EVMAddress?
    var receiver: &{FungibleToken.Receiver}?

    prepare(signer: auth(BorrowValue, SaveValue) &Account) {
        // Reference signer's COA if one exists
        let coa = signer.storage.borrow<auth(EVM.Withdraw) &EVM.CadenceOwnedAccount>(from: /storage/evm)

        // Reference signer's FlowToken Vault
        let sourceVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow signer's FlowToken.Vault")
        let cadenceBalance = sourceVault.balance

        // Define optional recipients for both VMs
        self.receiver = nil
        let cadenceRecipient = Address.fromString(addressString)
        self.evmRecipient = cadenceRecipient == nil ? EVM.addressFromString(addressString) : nil
        // Validate exactly one target address is assigned
        if cadenceRecipient != nil && self.evmRecipient != nil {
            panic("Malformed recipient address - assignable as both Cadence and EVM addresses")
        } else if cadenceRecipient == nil && self.evmRecipient == nil {
            panic("Malformed recipient address - not assignable as either Cadence or EVM address")
        }

        // Create empty FLOW vault to capture funds
        self.sentVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
        /// If the target VM is Flow, does the Vault have sufficient balance to cover?
        if cadenceRecipient != nil {
            // Assign the Receiver of the $FLOW transfer
            self.receiver = getAccount(cadenceRecipient!).capabilities.borrow<&{FungibleToken.Receiver}>(
                    /public/flowTokenReceiver
                ) ?? panic("Could not borrow reference to recipient's FungibleToken.Receiver")

            // Withdraw from the signer's Cadence Vault and deposit to sentVault
            var withdrawAmount = amount < cadenceBalance ? amount : cadenceBalance
            self.sentVault.deposit(from: <-sourceVault.withdraw(amount: withdrawAmount))

            // If the cadence balance didn't cover the amount, check the signer's EVM balance
            if amount > self.sentVault.balance {
                let difference = amount - cadenceBalance
                // Revert if the signer doesn't have an EVM account or EVM balance is insufficient
                if coa == nil || difference < coa!.balance().inFLOW() {
                    panic("Insufficient balance across Flow and EVM accounts")
                }

                // Withdraw from the signer's EVM account and deposit to sentVault
                let withdrawFromEVM = EVM.Balance(attoflow: 0)
                withdrawFromEVM.setFLOW(flow: difference)
                self.sentVault.deposit(from: <-coa!.withdraw(balance: withdrawFromEVM))
            }
        } else if self.evmRecipient != nil {
            // Check signer's balance can cover the amount
            if coa != nil {
                // Determine the amount to withdraw from the signer's EVM account
                let balance = coa!.balance()
                let withdrawAmount = amount < balance.inFLOW() ? amount : balance.inFLOW()
                balance.setFLOW(flow: withdrawAmount)

                // Withdraw funds from EVM to the sentVault
                self.sentVault.deposit(from: <-coa!.withdraw(balance: balance))
            }
            if amount > self.sentVault.balance {
                // Insufficient amount withdrawn from EVM, check signer's Flow balance
                let difference = amount - self.sentVault.balance
                if difference > cadenceBalance {
                    panic("Insufficient balance across Flow and EVM accounts")
                }
                // Withdraw from the signer's Cadence Vault and deposit to sentVault
                self.sentVault.deposit(from: <-sourceVault.withdraw(amount: difference))
            }
        }
    }

    pre {
        self.sentVault.balance == amount: "Attempting to send an incorrect amount of $FLOW"
    }

    execute {
        // Complete Cadence transfer if the FungibleToken Receiver is assigned
        if self.receiver != nil {
            self.receiver!.deposit(from: <-self.sentVault)
        } else {
            // Otherwise, complete EVM transfer
            self.evmRecipient!.deposit(from: <-self.sentVault)
        }
    }
}
