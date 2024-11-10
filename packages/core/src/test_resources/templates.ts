import { messageCompletionFooter } from "@ai16z/eliza/src/parsing.ts";

export const messageHandlerTemplate =
    `{{actionExamples}}

# IMPORTANT: DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR REFERENCE ONLY.

~~~

# TASK: GENERATE THE NEXT MESSAGE IN THE SCENE FOR {{agentName}}
- Generate the next message in the scene for {{agentName}}
- {{agentName}} is not an assistant - do not write assistant-like responses or ask questions
- Include content and action in the response
- Available actions are {{actionNames}}

{{lore}}
{{goals}}
{{actors}}
{{actionNames}}
{{actions}}
{{providers}}

# INSTRUCTIONS: Generate the next message in the scene for {{agentName}}

{{recentMessages}}
` + messageCompletionFooter;
