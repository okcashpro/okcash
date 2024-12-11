export const registerIPTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested IP registration:
- Field "contractAddress": Contract address of the NFT (ERC 721) to register
- Field "tokenId": Token ID of the NFT (ERC 721) to register

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "contractAddress": string | null,
    "tokenId": string | null
}
\`\`\`
`;

export const licenseIPTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested IP licensing:
- Field "licensorIpId": The IP Asset that you want to mint a license from
- Field "licenseTermsId": The license terms that you want to mint a license for
- Field "amount": The amount of licenses to mint

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "licensorIpId": string | null,
    "licenseTermsId": string | null,
    "amount": number | null
}
\`\`\`
`;

export const getAvailableLicensesTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested IP licensing:
- Field "ipid": The IP Asset that you want to mint a license from

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "ipid": string | null
}
\`\`\`
`;
