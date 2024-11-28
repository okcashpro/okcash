# Plugin TEE

A plugin for handling Trusted Execution Environment (TEE) operations.

## Providers

This plugin includes several providers for handling different TEE-related operations.

### DeriveKeyProvider

The `DeriveKeyProvider` allows for secure key derivation within a TEE environment.

#### Usage

```typescript
import { DeriveKeyProvider } from "@ai16z/plugin-tee";
// Initialize the provider
const provider = new DeriveKeyProvider();
// Derive a key
try {
    const keypair = await provider.deriveKey("/path/to/derive", "subject-identifier");
    // keypair can now be used for cryptographic operations
} catch (error) {
    console.error("Key derivation failed:", error);
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
