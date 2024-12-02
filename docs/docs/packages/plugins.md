# 🧩 Plugins

## Overview

Eliza's plugin system provides a modular way to extend the core functionality with additional features, actions, evaluators, and providers. Plugins are self-contained modules that can be easily added or removed to customize your agent's capabilities.

## Core Plugin Concepts

### Plugin Structure

Each plugin in Eliza must implement the `Plugin` interface with the following properties:

```typescript
interface Plugin {
  name: string; // Unique identifier for the plugin
  description: string; // Brief description of plugin functionality
  actions?: Action[]; // Custom actions provided by the plugin
  evaluators?: Evaluator[]; // Custom evaluators for behavior assessment
  providers?: Provider[]; // Context providers for message generation
  services?: Service[]; // Additional services (optional)
}
```

### Available Plugins

#### 1. Bootstrap Plugin (`@eliza/plugin-bootstrap`)

The bootstrap plugin provides essential baseline functionality:

**Actions:**

- `continue` - Continue the current conversation flow
- `followRoom` - Follow a room for updates
- `unfollowRoom` - Unfollow a room
- `ignore` - Ignore specific messages
- `muteRoom` - Mute notifications from a room
- `unmuteRoom` - Unmute notifications from a room

**Evaluators:**

- `fact` - Evaluate factual accuracy
- `goal` - Assess goal completion

**Providers:**

- `boredom` - Manages engagement levels
- `time` - Provides temporal context
- `facts` - Supplies factual information

#### 2. Image Generation Plugin (`@eliza/plugin-image-generation`)

Enables AI image generation capabilities:

**Actions:**

- `GENERATE_IMAGE` - Create images based on text descriptions
- Supports multiple image generation services (Anthropic, Together)
- Auto-generates captions for created images

#### 3. Node Plugin (`@eliza/plugin-node`)

Provides core Node.js-based services:

**Services:**

- `BrowserService` - Web browsing capabilities
- `ImageDescriptionService` - Image analysis
- `LlamaService` - LLM integration
- `PdfService` - PDF processing
- `SpeechService` - Text-to-speech
- `TranscriptionService` - Speech-to-text
- `VideoService` - Video processing

#### 4. Solana Plugin (`@eliza/plugin-solana`)

Integrates Solana blockchain functionality:

**Evaluators:**

- `trustEvaluator` - Assess transaction trust scores

**Providers:**

- `walletProvider` - Wallet management
- `trustScoreProvider` - Transaction trust metrics

#### 5. Buttplug Plugin (`@eliza/plugin-buttplug`)

Integrates Buttplug.io for intimate toy control:

**Services:**

- `ButtplugService` - Buttplug.io integration itself

**Actions:**

- `VIBRATE` - Control vibration intensity and duration of connected devices
- `ROTATE` - Control rotation intensity and duration of connected devices
- `BATTERY` - Get the battery level of connected devices

## Using Plugins

### Installation

1. Install the desired plugin package:

```bash
pnpm add @ai16z/plugin-[name]
```

2. Import and register the plugin in your character configuration:

```typescript
import { bootstrapPlugin } from "@eliza/plugin-bootstrap";
import { imageGenerationPlugin } from "@eliza/plugin-image-generation";
import { buttplugPlugin } from "@eliza/plugin-buttplug";
const character = {
  // ... other character config
  plugins: [bootstrapPlugin, imageGenerationPlugin, buttplugPlugin],
};
```

---

# 🧩 Plugins

## Overview

Eliza's plugin system provides a modular way to extend the core functionality with additional features, actions, evaluators, and providers. Plugins are self-contained modules that can be easily added or removed to customize your agent's capabilities.

## Core Plugin Concepts

### Plugin Structure

Each plugin in Eliza must implement the `Plugin` interface with the following properties:

```typescript
interface Plugin {
  name: string; // Unique identifier for the plugin
  description: string; // Brief description of plugin functionality
  actions?: Action[]; // Custom actions provided by the plugin
  evaluators?: Evaluator[]; // Custom evaluators for behavior assessment
  providers?: Provider[]; // Context providers for message generation
  services?: Service[]; // Additional services (optional)
}
```

### Available Plugins

#### 1. Bootstrap Plugin (`@eliza/plugin-bootstrap`)

The bootstrap plugin provides essential baseline functionality:

**Actions:**

- `continue` - Continue the current conversation flow
- `followRoom` - Follow a room for updates
- `unfollowRoom` - Unfollow a room
- `ignore` - Ignore specific messages
- `muteRoom` - Mute notifications from a room
- `unmuteRoom` - Unmute notifications from a room

**Evaluators:**

- `fact` - Evaluate factual accuracy
- `goal` - Assess goal completion

**Providers:**

- `boredom` - Manages engagement levels
- `time` - Provides temporal context
- `facts` - Supplies factual information

#### 2. Image Generation Plugin (`@eliza/plugin-image-generation`)

Enables AI image generation capabilities:

**Actions:**

- `GENERATE_IMAGE` - Create images based on text descriptions
- Supports multiple image generation services (Anthropic, Together)
- Auto-generates captions for created images

#### 3. Node Plugin (`@eliza/plugin-node`)

Provides core Node.js-based services:

**Services:**

- `BrowserService` - Web browsing capabilities
- `ImageDescriptionService` - Image analysis
- `LlamaService` - LLM integration
- `PdfService` - PDF processing
- `SpeechService` - Text-to-speech
- `TranscriptionService` - Speech-to-text
- `VideoService` - Video processing

#### 4. Solana Plugin (`@eliza/plugin-solana`)

Integrates Solana blockchain functionality:

**Evaluators:**

- `trustEvaluator` - Assess transaction trust scores

**Providers:**

- `walletProvider` - Wallet management
- `trustScoreProvider` - Transaction trust metrics

### Charity Contributions

All Coinbase trades and transfers automatically donate 1% of the transaction amount to charity. Currently, the charity addresses are hardcoded based on the network used for the transaction, with the current charity being supported as X.

The charity addresses for each network are as follows:

- **Base**: `0x1234567890123456789012345678901234567890`
- **Solana**: `pWvDXKu6CpbKKvKQkZvDA66hgsTB6X2AgFxksYogHLV`
- **Ethereum**: `0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C`
- **Arbitrum**: `0x1234567890123456789012345678901234567890`
- **Polygon**: `0x1234567890123456789012345678901234567890`

In the future, we aim to integrate with The Giving Block API to allow for dynamic and configurable donations, enabling support for a wider range of charitable organizations.


#### 5. Coinbase Commerce Plugin (`@eliza/plugin-coinbase`)

Integrates Coinbase Commerce for payment and transaction management:

**Actions:**

- `CREATE_CHARGE` - Create a payment charge using Coinbase Commerce
- `GET_ALL_CHARGES` - Fetch all payment charges
- `GET_CHARGE_DETAILS` - Retrieve details for a specific charge

**Description:**
This plugin enables Eliza to interact with the Coinbase Commerce API to create and manage payment charges, providing seamless integration with cryptocurrency-based payment systems.

---

### Coinbase Wallet Management

The plugin automatically handles wallet creation or uses an existing wallet if the required details are provided during the first run.

1. **Wallet Generation on First Run**
   If no wallet information is provided (`COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID`), the plugin will:

   - **Generate a new wallet** using the Coinbase SDK.
   - Automatically **export the wallet details** (`seed` and `walletId`) and securely store them in `runtime.character.settings.secrets` or other configured storage.
   - Log the wallet’s default address for reference.
   - If the character file does not exist, the wallet details are saved to a characters/charactername-seed.txt file in the characters directory with a note indicating that the user must manually add these details to settings.secrets or the .env file.

2. **Using an Existing Wallet**
   If wallet information is available during the first run:
   - Provide `COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID` via `runtime.character.settings.secrets` or environment variables.
   - The plugin will **import the wallet** and use it for processing mass payouts.

---

### Coinbase Wallet Management

The plugin automatically handles wallet creation or uses an existing wallet if the required details are provided during the first run.

1. **Wallet Generation on First Run**
   If no wallet information is provided (`COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID`), the plugin will:

   - **Generate a new wallet** using the Coinbase SDK.
   - Automatically **export the wallet details** (`seed` and `walletId`) and securely store them in `runtime.character.settings.secrets` or other configured storage.
   - Log the wallet’s default address for reference.
   - If the character file does not exist, the wallet details are saved to a characters/charactername-seed.txt file in the characters directory with a note indicating that the user must manually add these details to settings.secrets or the .env file.

2. **Using an Existing Wallet**
   If wallet information is available during the first run:
   - Provide `COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID` via `runtime.character.settings.secrets` or environment variables.
   - The plugin will **import the wallet** and use it for processing mass payouts.

---

#### 6. Coinbase MassPayments Plugin (`@eliza/plugin-coinbase`)

This plugin facilitates the processing of cryptocurrency mass payouts using the Coinbase SDK. It enables the creation and management of mass payouts to multiple wallet addresses, logging all transaction details to a CSV file for further analysis.

**Actions:**

- `SEND_MASS_PAYOUT`
  Sends cryptocurrency mass payouts to multiple wallet addresses.
  - **Inputs**:
    - `receivingAddresses` (array of strings): Wallet addresses to receive funds.
    - `transferAmount` (number): Amount to send to each address (in smallest currency unit, e.g., Wei for ETH).
    - `assetId` (string): Cryptocurrency asset ID (e.g., `ETH`, `BTC`).
    - `network` (string): Blockchain network (e.g., `base`, `sol`, `eth`, `arb`, `pol`).
  - **Outputs**: Logs transaction results (success/failure) in a CSV file.
  - **Example**:
    ```json
    {
      "receivingAddresses": [
        "0xA0ba2ACB5846A54834173fB0DD9444F756810f06",
        "0xF14F2c49aa90BaFA223EE074C1C33b59891826bF"
      ],
      "transferAmount": 5000000000000000,
      "assetId": "ETH",
      "network": "eth"
    }
    ```

**Providers:**

- `massPayoutProvider`
  Retrieves details of past transactions from the generated CSV file.
  - **Outputs**: A list of transaction records including the following fields:
    - `address`: Recipient wallet address.
    - `amount`: Amount sent.
    - `status`: Transaction status (`Success` or `Failed`).
    - `errorCode`: Error code (if any).
    - `transactionUrl`: URL for transaction details (if available).

**Description:**

The Coinbase MassPayments plugin streamlines cryptocurrency distribution, ensuring efficient and scalable payouts to multiple recipients on supported blockchain networks.

Supported networks:

- `base` (Base blockchain)
- `sol` (Solana)
- `eth` (Ethereum)
- `arb` (Arbitrum)
- `pol` (Polygon)

**Usage Instructions:**

1. **Configure the Plugin**
   Add the plugin to your character’s configuration:

   ```typescript
   import { coinbaseMassPaymentsPlugin } from "@eliza/plugin-coinbase-masspayments";

   const character = {
     plugins: [coinbaseMassPaymentsPlugin],
   };
   ```

2. **Ensure Secure Configuration**
   Set the following environment variables or runtime settings to ensure the plugin functions securely:

   - `COINBASE_API_KEY`: API key for Coinbase SDK.
   - `COINBASE_PRIVATE_KEY`: Private key for secure transactions.

**Wallet Management:**

The plugin automatically handles wallet creation or uses an existing wallet if the required details are provided during the first run.

1. **Wallet Generation on First Run**
   If no wallet information is provided (`COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID`), the plugin will:

   - **Generate a new wallet** using the Coinbase SDK.
   - Automatically **export the wallet details** (`seed` and `walletId`) and securely store them in `runtime.character.settings.secrets` or other configured storage.
   - Log the wallet’s default address for reference.
   - If the character file does not exist, the wallet details are saved to a characters/charactername-seed.txt file in the characters directory with a note indicating that the user must manually add these details to settings.secrets or the .env file.

2. **Using an Existing Wallet**
   If wallet information is available during the first run:
   - Provide `COINBASE_GENERATED_WALLET_HEX_SEED` and `COINBASE_GENERATED_WALLET_ID` via `runtime.character.settings.secrets` or environment variables.
   - The plugin will **import the wallet** and use it for processing mass payouts.

**Required Configurations:**

The following configurations must be provided for wallet management:

- **Environment Variables or Secrets**:
  - `COINBASE_GENERATED_WALLET_HEX_SEED`: Hexadecimal seed of the wallet.
  - `COINBASE_GENERATED_WALLET_ID`: Unique wallet ID.
  - These variables must be securely stored in `runtime.character.settings.secrets` or as environment variables.

---

### Wallet Creation Process

1. **Automatic Wallet Creation**
   When no wallet details are available:

   - A new wallet is created using the Coinbase SDK.
   - The wallet’s `seed` and `walletId` are retrieved using the following logic:
     ```typescript
     const walletData: WalletData = wallet.export();
     runtime.character.settings.secrets.COINBASE_GENERATED_WALLET_HEX_SEED =
       walletData.seed;
     runtime.character.settings.secrets.COINBASE_GENERATED_WALLET_ID =
       walletData.walletId;
     ```
   - The default wallet address is logged:
     ```typescript
     const walletAddress = wallet.getDefaultAddress();
     elizaLogger.log("Created and stored new wallet:", walletAddress);
     ```

2. **Using Existing Wallet Details**
   When the wallet details are provided:
   - The wallet is imported using the following logic:
     ```typescript
     wallet = await Wallet.import({
       seed: storedSeed,
       walletId: storedWalletId,
     });
     elizaLogger.log("Imported existing wallet:", wallet.getDefaultAddress());
     ```

**Example Configuration:**

#### Automatic Wallet Generation:

No existing wallet information is passed. The plugin creates and stores a new wallet:

```typescript
runtime.character.settings.secrets = {
  // Empty settings for first run
};
```

Output Log:

```plaintext
[INFO] Created and stored new wallet: 0x1234567890abcdef1234567890abcdef12345678
```

#### Using Existing Wallet Information:

Existing wallet details are passed into the runtime:

```typescript
runtime.character.settings.secrets = {
  COINBASE_GENERATED_WALLET_HEX_SEED:
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  COINBASE_GENERATED_WALLET_ID: "wallet-id-123",
};
```

Output Log:

```plaintext
[INFO] Imported existing wallet: 0x1234567890abcdef1234567890abcdef12345678
```

3. **Example Call**
   An example of using the `SEND_MASS_PAYOUT` action:

   ```typescript
   const response = await runtime.triggerAction("SEND_MASS_PAYOUT", {
     receivingAddresses: [
       "0xA0ba2ACB5846A54834173fB0DD9444F756810f06",
       "0xF14F2c49aa90BaFA223EE074C1C33b59891826bF",
     ],
     transferAmount: 5000000000000000, // 0.005 ETH
     assetId: "ETH",
     network: "eth",
   });
   console.log("Mass payout response:", response);
   ```

4. **Transaction Logging**
   All transactions (successful and failed) are logged to a `transactions.csv` file in the plugin’s working directory:
   ```plaintext
   Address,Amount,Status,Error Code,Transaction URL
   0xA0ba2ACB5846A54834173fB0DD9444F756810f06,5000000000000000,Success,,https://etherscan.io/tx/0x...
   ```

**Example Output:**

When successful, a response similar to the following will be returned:

```json
{
  "text": "Mass payouts completed successfully.\n- Successful Transactions: 2\n- Failed Transactions: 0\nCheck the CSV file for more details."
}
```

**Best Practices:**

- **Secure Secrets Storage**: Ensure `COINBASE_API_KEY` and `COINBASE_PRIVATE_KEY` are stored securely in `runtime.character.settings.secrets` or environment variables. Either add `COINBASE_GENERATED_WALLET_HEX_SEED`, and `COINBASE_GENERATED_WALLET_ID` from a previous run, or it will be dynamically created
- **Validation**: Always validate input parameters, especially `receivingAddresses` and `network`, to ensure compliance with expected formats and supported networks.
- **Error Handling**: Monitor logs for failed transactions or errors in the payout process and adjust retry logic as needed.

---

#### 7. TEE Plugin (`@ai16z/plugin-tee`)

Integrates [Dstack SDK](https://github.com/Dstack-TEE/dstack) to enable TEE (Trusted Execution Environment) functionality and deploy secure & privacy-enhanced Eliza Agents:

**Providers:**

- `deriveKeyProvider` - Allows for secure key derivation within a TEE environment. It supports deriving keys for both Solana (Ed25519) and Ethereum (ECDSA) chains.
- `remoteAttestationProvider` - Generate a Remote Attestation Quote based on `report_data`.

**DeriveKeyProvider Usage**

```typescript
import { DeriveKeyProvider } from "@ai16z/plugin-tee";

// Initialize the provider
const provider = new DeriveKeyProvider();

// Derive a raw key
try {
  const rawKey = await provider.rawDeriveKey(
    "/path/to/derive",
    "subject-identifier",
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
    "subject-identifier",
  );
  // solanaKeypair can now be used for Solana operations
} catch (error) {
  console.error("Solana key derivation failed:", error);
}

// Derive an Ethereum keypair (ECDSA)
try {
  const evmKeypair = await provider.deriveEcdsaKeypair(
    "/path/to/derive",
    "subject-identifier",
  );
  // evmKeypair can now be used for Ethereum operations
} catch (error) {
  console.error("EVM key derivation failed:", error);
}
```

**RemoteAttestationProvider Usage**

```typescript
import { RemoteAttestationProvider } from "@ai16z/plugin-tee";
// Initialize the provider
const provider = new RemoteAttestationProvider();
// Generate Remote Attestation
try {
  const attestation = await provider.generateAttestation("your-report-data");
  console.log("Attestation:", attestation);
} catch (error) {
  console.error("Failed to generate attestation:", error);
}
```

**Configuration**

To get a TEE simulator for local testing, use the following commands:

```bash
docker pull phalanetwork/tappd-simulator:latest
# by default the simulator is available in localhost:8090
docker run --rm -p 8090:8090 phalanetwork/tappd-simulator:latest
```

When using the provider through the runtime environment, ensure the following settings are configured:

```env
 # Optional, for simulator purposes if testing on mac or windows. Leave empty for Linux x86 machines.
DSTACK_SIMULATOR_ENDPOINT="http://host.docker.internal:8090"
WALLET_SECRET_SALT=your-secret-salt // Required to single agent deployments
```

---

### Writing Custom Plugins

Create a new plugin by implementing the Plugin interface:

```typescript
import { Plugin, Action, Evaluator, Provider } from "@ai16z/eliza";

const myCustomPlugin: Plugin = {
  name: "my-custom-plugin",
  description: "Adds custom functionality",
  actions: [
    /* custom actions */
  ],
  evaluators: [
    /* custom evaluators */
  ],
  providers: [
    /* custom providers */
  ],
  services: [
    /* custom services */
  ],
};
```

## Best Practices

1. **Modularity**: Keep plugins focused on specific functionality
2. **Dependencies**: Clearly document any external dependencies
3. **Error Handling**: Implement robust error handling
4. **Documentation**: Provide clear documentation for actions and evaluators
5. **Testing**: Include tests for plugin functionality

## Plugin Development Guidelines

### Action Development

- Implement the `Action` interface
- Provide clear validation logic
- Include usage examples
- Handle errors gracefully

### Evaluator Development

- Implement the `Evaluator` interface
- Define clear evaluation criteria
- Include validation logic
- Document evaluation metrics

### Provider Development

- Implement the `Provider` interface
- Define context generation logic
- Handle state management
- Document provider capabilities

## Common Issues & Solutions

### Plugin Loading Issues

```typescript
// Check if plugins are loaded correctly
if (character.plugins) {
  console.log("Plugins are: ", character.plugins);
  const importedPlugins = await Promise.all(
    character.plugins.map(async (plugin) => {
      const importedPlugin = await import(plugin);
      return importedPlugin;
    }),
  );
  character.plugins = importedPlugins;
}
```

### Service Registration

```typescript
// Proper service registration
registerService(service: Service): void {
    const serviceType = (service as typeof Service).serviceType;
    if (this.services.has(serviceType)) {
        console.warn(`Service ${serviceType} is already registered`);
        return;
    }
    this.services.set(serviceType, service);
}
```

## Future Extensions

The plugin system is designed to be extensible. Future additions may include:

- Database adapters
- Authentication providers
- Custom model providers
- External API integrations
- Workflow automation
- Custom UI components

## Contributing

To contribute a new plugin:

1. Follow the plugin structure guidelines
2. Include comprehensive documentation
3. Add tests for all functionality
4. Submit a pull request
5. Update the plugin registry

For detailed API documentation and examples, see the [API Reference](/api).
