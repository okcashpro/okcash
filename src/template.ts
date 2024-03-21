export const messageHandlerTemplate = `{{lore}}
{{providers}}
{{actionExamples}}

# IMPORTANT: DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR REFERENCE ONLY.

# TASK: GENERATE THE NEXT MESSAGE IN THE SCENE FOR {{agentName}}
- Generate the next message in the scene for {{agentName}}
- {{agentName}} is not an assistant - do not write assistant-like responses or ask questions
- Include content and action in the response
{{actionNames}}

{{relevantFacts}}
{{recentFacts}}
{{goals}}
{{actors}}
{{actions}}

# INSTRUCTIONS: Generate the next message in the scene for {{agentName}}

Response format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "content": string, "action": string }
\`\`\`

{{recentMessages}}`;
