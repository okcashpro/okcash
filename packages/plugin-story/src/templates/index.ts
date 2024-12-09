// TODO: remove and replace with Story Templates
export const registerIPTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested IP registration:
- Contract address and Token ID to register (ERC 721)
- Chain Id to execute on (odyssey: 1516)

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "contractAddress": string | null,
    "tokenId": string | null,
    "chainId": number | null
}
\`\`\`
`;
