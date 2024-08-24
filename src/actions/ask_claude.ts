import Anthropic from "@anthropic-ai/sdk";
import { default as getUuid } from "uuid-by-string";
import { composeContext } from "../core/context.ts";
import { log_to_file } from "../core/logger.ts";
import { embeddingZeroVector } from "../core/memory.ts";
import { parseJSONObjectFromText } from "../core/parsing.ts";
import { AgentRuntime } from "../core/runtime.ts";
import settings from "../core/settings.ts";
import {
  Action,
  ActionExample,
  Content,
  Message,
  State,
  UUID,
} from "../core/types.ts";
import { ContentBlock } from "@anthropic-ai/sdk/resources/messages";

export const claudeHandlerTemplate = `# Attachments
{{attachments}}

{{recentMessages}}

# Instructions: Claude, I need your help in assisting the user with their last request. Please provide a helpful, thorough response. I have no arms, so you'll have to write out any implements and take care not to omit or leave TODOs for later. Also, please don't acknowledge the request, just do it.`;

export default {
  name: "ASK_CLAUDE",
  description:
    "Asks Claude for assistance with the user's request, providing the current conversation context and attachments.",
  validate: async (runtime: AgentRuntime, message: Message, state: State) => {
    // Check if the ANTHROPIC_API_KEY is set in the environment variables
    return !!settings.ANTHROPIC_API_KEY;
  },
  handler: async (
    runtime: AgentRuntime,
    message: Message,
    state: State,
    options: any,
    callback: any,
  ) => {
    state = (await runtime.composeState(message)) as State;
    const user_id = runtime.agentId;

    const context = composeContext({
      state,
      template: claudeHandlerTemplate,
    });

    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(`${state.agentName}_${datestr}_claude_context`, context);

    let responseContent;
    let callbackData: Content = {
      content: responseContent,
      action: "CLAUDE_RESPONSE",
      source: "Claude",
      attachments: [],
    };
    const { room_id } = message;

    const anthropic = new Anthropic({
      // defaults to process.env["ANTHROPIC_API_KEY"]
      apiKey: settings.ANTHROPIC_API_KEY,
    });

    let attachments = [];
    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 8192,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: context,
            },
          ],
          tools: [],
        });

        responseContent = (response.content[0] as any).text;

        // Store Claude's response as an attachment
        const attachmentId =
          `claude-${Date.now()}-${Math.floor(Math.random() * 1000)}`.slice(-5);
        const lines = responseContent.split("\n");
        const description = lines.slice(0, 3).join("\n");
        callbackData.content = responseContent;
        callbackData.attachments.push({
          id: attachmentId,
          url: "",
          title: "Message from Claude",
          source: "Claude",
          description,
          text: responseContent,
        });
        callback(callbackData);

        // After sending the callback data to the client, abbreviate it to the reference
        callbackData.content = `Claude said: (${attachmentId})`;

        // log response to file
        log_to_file(
          `${state.agentName}_${datestr}_claude_response_${3 - triesLeft}`,
          responseContent,
        );

        runtime.databaseAdapter.log({
          body: { message, context, response: responseContent },
          user_id: user_id as UUID,
          room_id,
          type: "claude",
        });
        break;
      } catch (error) {
        console.error(error);
        continue;
      }
    }

    if (!responseContent) {
      return;
    }

    const _saveResponseMessage = async (
      message: Message,
      state: State,
      responseContent: Content,
    ) => {
      const { user_id, room_id } = message;

      responseContent.content = responseContent.content?.trim();

      if (responseContent.content) {
        await runtime.messageManager.createMemory({
          user_id: user_id,
          content: responseContent,
          room_id,
          embedding: embeddingZeroVector,
        });
        await runtime.evaluate(message, { ...state, responseContent });
      } else {
        console.warn("Empty response from Claude, skipping");
      }
    };

    console.log("Calling callback with data:", callbackData);

    await _saveResponseMessage(message, state, callbackData);

    return callbackData;
  },
  condition:
    "The agent needs assistance from Claude to better respond to the user's request.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content: "```js\nconst x = 10\n```",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Hey, can you help me with the code I just pasted?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Let me ask Claude and get back to you.",
          action: "ASK_CLAUDE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "I need to write a compelling cover letter for a job application as a marketing manager at a tech startup. Can you help me structure it and highlight key points?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "I'll ask Claude to help you with that. Give me a second.",
          action: "ASK_CLAUDE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "I'm planning a trip to Japan next month and I'm overwhelmed with all the information. Can you help me create a 10-day itinerary that covers Tokyo, Kyoto, and Osaka, including must-see attractions, local cuisine recommendations, and transportation tips?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "No problem. I'll ask Claude to help create a detailed itinerary for you. Just a moment while I gather that information.",
          action: "ASK_CLAUDE",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
