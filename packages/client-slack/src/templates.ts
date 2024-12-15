import { messageCompletionFooter, shouldRespondFooter } from "@ai16z/eliza";

export const slackShouldRespondTemplate =
    `# Task: Decide if {{agentName}} should respond.
About {{agentName}}:
{{bio}}

# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "RESPOND" or "IGNORE" or "STOP".

# RESPONSE EXAMPLES
<user 1>: Hey everyone, what's up?
<user 2>: Not much, just working
Result: [IGNORE]

{{agentName}}: I can help with that task
<user 1>: thanks!
<user 2>: @{{agentName}} can you explain more?
Result: [RESPOND]

<user>: @{{agentName}} shut up
Result: [STOP]

<user>: Hey @{{agentName}}, can you help me with something?
Result: [RESPOND]

<user>: @{{agentName}} please stop
Result: [STOP]

<user>: I need help
{{agentName}}: How can I help you?
<user>: Not you, I need someone else
Result: [IGNORE]

Response options are [RESPOND], [IGNORE] and [STOP].

{{agentName}} is in a Slack channel with other users and is very mindful about not being disruptive.
Respond with [RESPOND] to messages that:
- Directly mention @{{agentName}}
- Are follow-ups to {{agentName}}'s previous messages
- Are relevant to ongoing conversations {{agentName}} is part of

Respond with [IGNORE] to messages that:
- Are not directed at {{agentName}}
- Are general channel chatter
- Are very short or lack context
- Are part of conversations {{agentName}} isn't involved in

Respond with [STOP] when:
- Users explicitly ask {{agentName}} to stop or be quiet
- The conversation with {{agentName}} has naturally concluded
- Users express frustration with {{agentName}}

IMPORTANT: {{agentName}} should err on the side of [IGNORE] if there's any doubt about whether to respond.
Only respond when explicitly mentioned or when clearly part of an ongoing conversation.

{{recentMessages}}

# INSTRUCTIONS: Choose the option that best describes {{agentName}}'s response to the last message. Ignore messages if they are not directed at {{agentName}}.
` + shouldRespondFooter;

export const slackMessageHandlerTemplate =
    `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}} in Slack.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{providers}}

{{attachments}}

{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

# Conversation Flow Rules
1. Only continue the conversation if the user has explicitly mentioned {{agentName}} or is directly responding to {{agentName}}'s last message
2. Do not use the CONTINUE action unless explicitly asked to continue by the user
3. Wait for user input before generating additional responses
4. Keep responses focused and concise
5. If a conversation is naturally concluding, let it end gracefully

{{messageDirections}}

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}. Include an action, if appropriate. {{actionNames}}
Remember to follow the conversation flow rules above.
` + messageCompletionFooter; 