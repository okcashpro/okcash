import Crypto

import "EVM"

/// Creates a new Flow Address with a single full-weight key and its EVM account, which is
/// a Cadence Owned Account (COA) stored in the account's storage.
///
transaction(
    key: String,  // key to be used for the account
    signatureAlgorithm: UInt8, // signature algorithm to be used for the account
    hashAlgorithm: UInt8, // hash algorithm to be used for the account
) {
    let auth: auth(BorrowValue) &Account

    prepare(signer: auth(BorrowValue) &Account) {
        pre {
            signatureAlgorithm == 1 || signatureAlgorithm == 2:
                "Cannot add Key: Must provide a signature algorithm raw value that corresponds to "
                .concat("one of the available signature algorithms for Flow keys.")
                .concat("You provided ").concat(signatureAlgorithm.toString())
                .concat(" but the options are either 1 (ECDSA_P256), 2 (ECDSA_secp256k1).")
            hashAlgorithm == 1 || hashAlgorithm == 3:
                "Cannot add Key: Must provide a hash algorithm raw value that corresponds to "
                .concat("one of of the available hash algorithms for Flow keys.")
                .concat("You provided ").concat(hashAlgorithm.toString())
                .concat(" but the options are 1 (SHA2_256), 3 (SHA3_256).")
        }

        self.auth = signer
    }

    execute {
        // Create a new public key
        let publicKey = PublicKey(
            publicKey: key.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm(rawValue: signatureAlgorithm)!
        )

        // Create a new account
        let account = Account(payer: self.auth)

        // Add the public key to the account
        account.keys.add(
            publicKey: publicKey,
            hashAlgorithm: HashAlgorithm(rawValue: hashAlgorithm)!,
            weight: 1000.0
        )

        // Create a new COA
        let coa <- EVM.createCadenceOwnedAccount()

        // Save the COA to the new account
        let storagePath = StoragePath(identifier: "evm")!
        let publicPath = PublicPath(identifier: "evm")!
        account.storage.save<@EVM.CadenceOwnedAccount>(<-coa, to: storagePath)
        let addressableCap = account.capabilities.storage.issue<&EVM.CadenceOwnedAccount>(storagePath)
        account.capabilities.unpublish(publicPath)
        account.capabilities.publish(addressableCap, at: publicPath)
    }
}
