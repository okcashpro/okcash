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
