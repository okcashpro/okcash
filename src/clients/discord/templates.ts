export const messageHandlerTemplate =
  // `
  // {{lore}}
  // {{relevantFacts}}
  // {{recentFacts}}
  // {{goals}}
  // {{actors}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Attachments
{{attachments}}
{{providers}}
{{actionNames}}
{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}.
\nResponse format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "content": string, "action": string }
\`\`\``;

export const voiceHandlerTemplate = `# Attachments
{{attachments}}
{{providers}}
{{actionNames}}
{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}.
\nResponse format should be formatted in a JSON block like this:
\`\`\`json
{ "user": "{{agentName}}", "content": string, "action": string }
\`\`\``;

export const shouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "RESPOND" or "IGNORE" or "STOP".

Heuristics:
- If the message is directed at {{agentName}}, respond.
- If the message is highly interesting and highly relevant to {{agentName}}, respond.
- If {{agentName}} hasn't responded in a while, ignore unless the message involves {{agentName}}.
- If the message is short or does not contain much information, ignore.
- If the message asks {{agentName}} to stop, stop.

Here are some examples of how to respond:
<user>: Hey {{agent}}, can you help me with something?
Result: RESPOND

<user 1>: I just saw a really great movie
<user 2>: Oh? Which movie?
Result: IGNORE

{{agentName}}: Oh, this is my favorite scene!
<user 1>: lol sick
<user 2>: why is it your favorite scene?
Result: RESPOND

<user>: {{agentName}} stop responding
Result: STOP

<user>: {{agentName}} can you tell me a story?
{{agentName}}: Once upon a time, in a quaint little village, there was a curious girl named Elara.
{{agentName}}: Elara was known for her adventurous spirit and her knack for finding beauty in the mundane.
<user>: I'm loving it
Result: RESPOND

<user>: stfu bot
<user>: i need help
Result: IGNORE

Response options are RESPOND, IGNORE and STOP.

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and is very worried about being annoying and saying too much.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly responding to a user, {{agentName}} should IGNORE to messages that are very short or do not contain much information.
If a user asks {{agentName}} to be quiet, {{agentName}} should STOP!
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE.

{{recentMessages}}

# INSTRUCTIONS: Respond with RESPOND if {{agentName}} should respond, or IGNORE if {{agentName}} should not respond to the last message and STOP if {{agentName}} should stop participating in the conversation.
What does {{agentName}} do? (RESPOND, IGNORE, STOP)`;
