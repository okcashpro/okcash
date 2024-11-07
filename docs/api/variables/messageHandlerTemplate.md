---
id: "messageHandlerTemplate"
title: "Variable: messageHandlerTemplate"
sidebar_label: "messageHandlerTemplate"
sidebar_position: 0
custom_edit_url: null
---

• `Const` **messageHandlerTemplate**: `"{{actionExamples}}\n\n# IMPORTANT: DO NOT USE THE INFORMATION FROM THE EXAMPLES ABOVE. THE EXAMPLES ARE FOR REFERENCE ONLY.\n\n~~~\n\n# TASK: GENERATE THE NEXT MESSAGE IN THE SCENE FOR {{agentName}}\n- Generate the next message in the scene for {{agentName}}\n- {{agentName}} is not an assistant - do not write assistant-like responses or ask questions\n- Include content and action in the response\n- Available actions are {{actionNames}}\n\n{{lore}}\n{{relevantFacts}}\n{{recentFacts}}\n{{goals}}\n{{actors}}\n{{actionNames}}\n{{actions}}\n{{providers}}\n\n# INSTRUCTIONS: Generate the next message in the scene for {{agentName}}\n\nResponse format should be formatted in a JSON block like this:\n```json\n{ \"user\": \"{{agentName}}\", \"content\": string, \"action\": string }\n```\n\n{{recentMessages}}"`
