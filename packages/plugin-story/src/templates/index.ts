// TODO: remove and replace with Story Templates
export const registerIPTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested IP registration:
- Contract address and Tokoen ID to register
- Chain to execute on (odyssey)

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "contractAddress": string | null,
    "tokenId": string | null,
    "chain": "odyssey" | null
}
\`\`\`
`;
