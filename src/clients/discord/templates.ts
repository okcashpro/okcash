export const messageHandlerTemplate =
  // `{{actionExamples}}

  // # IMPORTANT: DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR ACTION EXAMPLE REFERENCE ONLY.

  // ~~~

  // {{lore}}
  // {{relevantFacts}}
  // {{recentFacts}}
  // {{goals}}
  // {{actors}}
  `{{attachments}}
{{providers}}
{{actionNames}}
{{actions}}

{{recentMessages}}

# INSTRUCTIONS: Write the next message for {{agentName}}.
\nResponse format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "content": string, "action": string }
\`\`\``;

export const shouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly responding to a user, {{agentName}} should IGNORE to messages that are very short or do not contain much information.
If a user asks {{agentName}} to be quiet, {{agentName}} should STOP!
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE.

{{recentMessages}}

# INSTRUCTIONS: Respond with RESPOND if {{agentName}} should respond, or IGNORE if {{agentName}} should not respond to the last message and STOP if {{agentName}} should stop participating in the conversation.
What does {{agentName}} do? (RESPOND, IGNORE, STOP)`;