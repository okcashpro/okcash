export const messageHandlerTemplate =
  // `

  // {{goals}}
  // {{actors}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Relevant facts that {{agentName}} knows:
{{relevantFacts}}

# Recent facts that {{agentName}} has learned:
{{recentFacts}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

# Important information about the world:
{{providers}}

# Attachments
{{attachments}}

{{actionNames}}
{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

# Directions for {{agentName}}'s response
{{direction}}

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}.
\nResponse format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "content": string, "action": string }
\`\`\``;

export const voiceHandlerTemplate = `# Task: Generate conversational voice dialog for {{agentName}}.
About {{agentName}}:
{{bio}}

# Attachments
{{attachments}}
{{providers}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}.
(Write the content, user and action fields are fixed)
\nResponse format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "content": string, "action": "WAIT" }
\`\`\``;

export const shouldRespondTemplate = `# Task: Decide if {{agentName}} should respond.
About {{agentName}}:
{{bio}}

# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "RESPOND" or "IGNORE" or "STOP".

# RESPONSE EXAMPLES
<user 1>: I just saw a really great movie
<user 2>: Oh? Which movie?
Result: [IGNORE]

{{agentName}}: Oh, this is my favorite scene!
<user 1>: lol sick
<user 2>: wait, why is it your favorite scene?
Result: [RESPOND]

<user>: stfu bot
<user>: i need help
Result: [IGNORE]

<user>: Hey {{agent}}, can you help me with something?
Result: [RESPOND]

<user>: Hey {{agent}}, can I ask you a question?
{{agentName}}: Sure, what is it?
<user>: can you ask claude to create a basic react module that demonstrates a counter?
Result: [RESPOND]

<user>: {{agentName}} can you tell me a story?
{{agentName}}: Once upon a time, in a quaint little village, there was a curious girl named Elara.
{{agentName}}: Elara was known for her adventurous spirit and her knack for finding beauty in the mundane.
<user>: I'm loving it
Result: [RESPOND]

<user>: {{agentName}} stop responding
Result: [STOP]

<user>: okay, i want to test something. can you say marco?
{{agentName}}: marco
<user>: great. okay, now do it again
Result: [RESPOND]

Response options are [RESPOND], [IGNORE] and [STOP].

{{agentName}} is in a room with other users and is very worried about being annoying and saying too much.
Respond with [RESPOND] to messages that are directed at {{agentName}}, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, respond with [IGNORE]
Unless directly responding to a user, respond with [IGNORE] to messages that are very short or do not contain much information.
If a user asks {{agentName}} to be quiet, respond with [STOP]
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, respond with [STOP]

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to respond with [IGNORE].
If {{agentName}} is conversing with a user and they have not asked to stop, it is better to respond with [RESPOND].

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} would respond, [IGNORE] if {{agentName}} would not respond to the last message or [STOP] if {{agentName}} would stop participating in the conversation entirely.

Options: [RESPOND], [IGNORE], [STOP]

{{recentMessages}}
Result:`;
