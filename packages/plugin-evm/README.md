# `@ai16z/plugin-evm`

This plugin provides actions and providers for interacting with EVM-compatible chains.

---

## Configuration

### Default Setup

By default, **Ethereum mainnet** is enabled. To use it, simply add your private key to the `.env` file:

```env
EVM_PRIVATE_KEY=your-private-key-here
```

### Adding Support for Other Chains

To enable support for additional chains, add them to the character config like this:

```json
"settings": {
    "chains": {
        "evm": [
            "base", "arbitrum", "iotex"
        ]
    }
}
```

Note: The chain names must match those in the viem/chains.

### Custom RPC URLs

By default, the RPC URL is inferred from the `viem/chains` config. To use a custom RPC URL for a specific chain, add the following to your `.env` file:

```env
ETHEREUM_PROVIDER_<CHAIN_NAME>=https://your-custom-rpc-url
```

**Example usage:**

```env
ETHEREUM_PROVIDER_IOTEX=https://iotex-network.rpc.thirdweb.com
```

#### Custom RPC for Ethereum Mainnet

To set a custom RPC URL for Ethereum mainnet, use:

```env
EVM_PROVIDER_URL=https://your-custom-mainnet-rpc-url
```

## Provider

The **Wallet Provider** initializes with the **first chain in the list** as the default (or Ethereum mainnet if none are added). It:

- Provides the **context** of the currently connected address and its balance.
- Creates **Public** and **Wallet clients** to interact with the supported chains.
- Allows adding chains dynamically at runtime.

---

## Actions

### Transfer

Transfer tokens from one address to another on any EVM-compatible chain. Just specify the:

- **Amount**
- **Chain**
- **Recipient Address**

**Example usage:**

```bash
Transfer 1 ETH to 0xRecipient on arbitrum.
```

---

## Contribution

The plugin contains tests. Whether you're using **TDD** or not, please make sure to run the tests before submitting a PR.

### Running Tests

Navigate to the `plugin-evm` directory and run:

```bash
pnpm test
```
