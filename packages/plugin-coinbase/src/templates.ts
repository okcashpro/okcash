export const chargeTemplate = `
Extract the following details to create a Coinbase charge:
- **price** (number): The amount for the charge (e.g., 100.00).
- **currency** (string): The 3-letter ISO 4217 currency code (e.g., USD, EUR).
- **type** (string): The pricing type for the charge (e.g., fixed_price, dynamic_price). Assume price type is fixed unless otherwise stated
- **name** (string): A non-empty name for the charge (e.g., "The Human Fund").
- **description** (string): A non-empty description of the charge (e.g., "Money For People").

Provide the values in the following JSON format:

\`\`\`json
{
    "price": <number>,
    "currency": "<currency>",
    "type": "<type>",
    "name": "<name>",
    "description": "<description>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const getChargeTemplate = `
Extract the details for a Coinbase charge using the provided charge ID:
- **charge_id** (string): The unique identifier of the charge (e.g., "2b364ef7-ad60-4fcd-958b-e550a3c47dc6").

Provide the charge details in the following JSON format after retrieving the charge details:

\`\`\`json
{
    "charge_id": "<charge_id>",
    "price": <number>,
    "currency": "<currency>",
    "type": "<type>",
    "name": "<name>",
    "description": "<description>",
    "status": "<status>",
    "created_at": "<ISO8601 timestamp>",
    "expires_at": "<ISO8601 timestamp>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const transferTemplate = `
Extract the following details for processing a mass payout using the Coinbase SDK:
- **receivingAddresses** (array): A list of wallet addresses receiving the funds.
- **transferAmount** (number): The amount to transfer to each address.
- **assetId** (string): The asset ID to transfer (e.g., ETH, BTC).
- **network** (string): The blockchain network to use. Allowed values are:
    static networks: {
        readonly BaseSepolia: "base-sepolia";
        readonly BaseMainnet: "base-mainnet";
        readonly EthereumHolesky: "ethereum-holesky";
        readonly EthereumMainnet: "ethereum-mainnet";
        readonly PolygonMainnet: "polygon-mainnet";
        readonly SolanaDevnet: "solana-devnet";
        readonly SolanaMainnet: "solana-mainnet";
        readonly ArbitrumMainnet: "arbitrum-mainnet";
    };

Provide the details in the following JSON format:

\`\`\`json
{
    "receivingAddresses": ["<receiving_address_1>", "<receiving_address_2>"],
    "transferAmount": <amount>,
    "assetId": "<asset_id>",
    "network": "<network>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const tradeTemplate = `
Extract the following details for processing a trade using the Coinbase SDK:
- **network** (string): The blockchain network to use (e.g., base, sol, eth, arb, pol).
- **amount** (number): The amount to trade.
- **sourceAsset** (string): The asset ID to trade from (must be one of: ETH, SOL, USDC, WETH, GWEI, LAMPORT).
- **targetAsset** (string): The asset ID to trade to (must be one of: ETH, SOL, USDC, WETH, GWEI, LAMPORT).

Ensure that:
1. **network** is one of the supported networks: "base", "sol", "eth", "arb", or "pol".
2. **sourceAsset** and **targetAsset** are valid assets from the provided list.
3. **amount** is a positive number.

Provide the details in the following JSON format:

\`\`\`json
{
    "network": "<network>",
    "amount": <amount>,
    "sourceAsset": "<source_asset_id>",
    "targetAsset": "<target_asset_id>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const tokenContractTemplate = `
Extract the following details for deploying a token contract using the Coinbase SDK:
- **contractType** (string): The type of token contract to deploy (ERC20, ERC721, or ERC1155)
- **name** (string): The name of the token
- **symbol** (string): The symbol of the token
- **network** (string): The blockchain network to deploy on (e.g., base, eth, arb, pol)
- **baseURI** (string, optional): The base URI for token metadata (required for ERC721 and ERC1155)
- **totalSupply** (number, optional): The total supply of tokens (only for ERC20)

Provide the details in the following JSON format:

\`\`\`json
{
    "contractType": "<contract_type>",
    "name": "<token_name>",
    "symbol": "<token_symbol>",
    "network": "<network>",
    "baseURI": "<base_uri>",
    "totalSupply": <total_supply>
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

// Add to templates.ts
export const contractInvocationTemplate = `
Extract the following details for invoking a smart contract using the Coinbase SDK:
- **contractAddress** (string): The address of the contract to invoke
- **method** (string): The method to invoke on the contract
- **abi** (array): The ABI of the contract
- **args** (object, optional): The arguments to pass to the contract method
- **amount** (number, optional): The amount of the asset to send to a payable contract method
- **assetId** (string, optional): The ID of the asset to send to a payable contract method
- **network** (string): The blockchain network to use (e.g., base, eth, arb, pol)

Provide the details in the following JSON format:

\`\`\`json
{
    "contractAddress": "<contract_address>",
    "method": "<method_name>",
    "abi": [<contract_abi>],
    "args": {
        "<arg_name>": "<arg_value>"
    },
    "amount": <amount>,
    "assetId": "<asset_id>",
    "network": "<network>"
}
\`\`\`

Example for invoking a transfer method on an ERC20 token contract:

\`\`\`json
{
    "contractAddress": "0x37f2131ebbc8f97717edc3456879ef56b9f4b97b",
    "method": "transfer",
    "abi": [
        {
            "constant": false,
            "inputs": [
                {
                    "name": "to",
                    "type": "address"
                },
                {
                    "name": "value",
                    "type": "uint256"
                }
            ],
            "name": "transfer",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "payable": false,
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ],
    "args": {
        "to": "0xRecipientAddressHere",
        "value": 1000
    },
    "network": "eth"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;