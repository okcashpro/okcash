---
id: "evaluationTemplate"
title: "Variable: evaluationTemplate"
sidebar_label: "evaluationTemplate"
sidebar_position: 0
custom_edit_url: null
---

• `Const` **evaluationTemplate**: `"TASK: Based on the conversation and conditions, determine which evaluation functions are appropriate to call.\nExamples:\n{{evaluatorExamples}}\n\nINSTRUCTIONS: You are helping me to decide which appropriate functions to call based on the conversation between {{senderName}} and {{agentName}}.\n\n{{recentMessages}}\n\nEvaluator Functions:\n{{evaluators}}\n\nEvaluator Conditions:\n{{evaluatorConditions}}\n\nTASK: Based on the most recent conversation, determine which evaluators functions are appropriate to call to call.\nInclude the name of evaluators that are relevant and should be called in the array\nAvailable evaluator names to include are {{evaluatorNames}}\nRespond with a JSON array containing a field for description in a JSON block formatted for markdown with this structure:\n```json\n[\n  'evaluatorName',\n  'evaluatorName'\n]\n```\n\nYour response must include the JSON block."`

Template used for the evaluation completion.
