# Plugin TEE

A plugin for handling Trusted Execution Environment (TEE) operations.

## Providers

This plugin includes several providers for handling different TEE-related operations.

### DeriveKeyProvider

The `DeriveKeyProvider` allows for secure key derivation within a TEE environment. It supports deriving keys for both Solana (Ed25519) and Ethereum (ECDSA) chains.

#### Usage

```typescript
import { DeriveKeyProvider } from "@ai16z/plugin-tee";

// Initialize the provider
const provider = new DeriveKeyProvider();

// Derive a raw key
try {
    const rawKey = await provider.rawDeriveKey(
        "/path/to/derive",
        "subject-identifier"
    );
    // rawKey is a DeriveKeyResponse that can be used for further processing
    // to get the uint8Array do the following
    const rawKeyArray = rawKey.asUint8Array();
} catch (error) {
    console.error("Raw key derivation failed:", error);
}

// Derive a Solana keypair (Ed25519)
try {
    const solanaKeypair = await provider.deriveEd25519Keypair(
        "/path/to/derive",
        "subject-identifier"
    );
    // solanaKeypair can now be used for Solana operations
} catch (error) {
    console.error("Solana key derivation failed:", error);
}

// Derive an Ethereum keypair (ECDSA)
try {
    const evmKeypair = await provider.deriveEcdsaKeypair(
        "/path/to/derive",
        "subject-identifier"
    );
    // evmKeypair can now be used for Ethereum operations
} catch (error) {
    console.error("EVM key derivation failed:", error);
}
```

### RemoteAttestationProvider

The `RemoteAttestationProvider` allows for generating a remote attestation within a TEE environment.

#### Usage

```typescript
const provider = new RemoteAttestationProvider();

try {
    const attestation = await provider.generateAttestation("your-report-data");
    console.log("Attestation:", attestation);
} catch (error) {
    console.error("Failed to generate attestation:", error);
}
```

### Configuration

When using the provider through the runtime environment, ensure the following settings are configured:

```env
DSTACK_SIMULATOR_ENDPOINT="your-endpoint-url" # Optional, for simulator purposes if testing on mac or windows
WALLET_SECRET_SALT=your-secret-salt // Required to single agent deployments
```
