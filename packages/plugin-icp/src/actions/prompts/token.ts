export const createTokenTemplate = `Based on the user's description, generate creative and memorable values for a new meme token on PickPump:

User's idea: "{{recentMessages}}"

Please generate:
1. A catchy and fun token name that reflects the theme
2. A 3-4 letter symbol based on the name (all caps)
3. An engaging and humorous description (include emojis)
4. Set other fields to null

Example response:
\`\`\`json
{
    "name": "CatLaser",
    "symbol": "PAWS",
    "description": "The first meme token powered by feline laser-chasing energy! Watch your investment zoom around like a red dot! 😺🔴✨",
    "logo": null,
    "website": null,
    "twitter": null,
    "telegram": null
}
\`\`\`

Generate appropriate meme token information based on the user's description.
Respond with a JSON markdown block containing only the generated values.`;

export const logoPromptTemplate = `Based on this token idea: "{{description}}", create a detailed prompt for generating a logo image.
The prompt should describe visual elements, style, and mood for the logo.
Focus on making it memorable and suitable for a cryptocurrency token.
Keep the response short and specific.
Respond with only the prompt text, no additional formatting.

Example for a dog-themed token:
"A playful cartoon dog face with a cryptocurrency symbol on its collar, using vibrant colors and bold outlines, crypto-themed minimal style"`;
