export const registerIPTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested IP registration:
- Field "title": The title of your IP
- Field "description": The description of your IP
- Field "ipType": The type of your IP. Type of the IP Asset, can be defined arbitrarily by the
creator. I.e. “character”, “chapter”, “location”, “items”, "music", etc. If a user doesn't provide
an ipType, you can infer it from the title and description. It should be one word.

Respond with a JSON markdown block containing only the extracted values. A user must explicity provide a title and description.

\`\`\`json
{
    "title": string,
    "description": string,
    "ipType": string
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
