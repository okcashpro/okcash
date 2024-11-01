import Anthropic from "@anthropic-ai/sdk";
import { composeContext } from "../core/context.ts";
import { log_to_file } from "../core/logger.ts";
import { embeddingZeroVector } from "../core/memory.ts";
import {
  Action,
  ActionExample,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  UUID,
} from "../core/types.ts";

export const claudeHandlerTemplate = `{{attachments}}

{{recentMessages}}

# Instructions: Claude, I need your help in assisting the user with their last request. Please provide a helpful, thorough response. I have no arms, so you'll have to write out any implements and take care not to omit or leave TODOs for later. Also, please don't acknowledge the request, just do it.`;

export default {
  name: "ASK_CLAUDE",
  similes: ["CLAUDE", "CALL_CLAUDE", "ANTHROPIC", "SONNET", "OPUS"],
  description:
    "Asks Claude for assistance with the user's request, providing the current conversation context and attachments.",
  validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    // Check if the ANTHROPIC_API_KEY is set in the environment variables
    return !!runtime.getSetting("ANTHROPIC_API_KEY");
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ) => {
    state = (await runtime.composeState(message)) as State;
    const userId = runtime.agentId;

    const context = composeContext({
      state,
      template: claudeHandlerTemplate,
    });

    const datestr = new Date().toUTCString().replace(/:/g, "-");

    // log context to file
    log_to_file(`${state.agentName}_${datestr}_claude_context`, context);

    let responseContent;
    const callbackData: Content = {
      text: undefined, // fill in later
      action: "CLAUDE_RESPONSE",
      source: "Claude",
      attachments: [],
    };
    const { roomId } = message;

    const anthropic = new Anthropic({
      // defaults to process.env["ANTHROPIC_API_KEY"]
      apiKey: runtime.getSetting("ANTHROPIC_API_KEY"),
    });

    const attachments = [];
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
        callbackData.inReplyTo = message.id;
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
          userId: userId as UUID,
          roomId,
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

    const response = {
      userId,
      content: callbackData,
      roomId,
      embedding: embeddingZeroVector,
    };

    if (responseContent.text?.trim()) {
      await runtime.messageManager.createMemory(response);
      await runtime.evaluate(message, state);
    } else {
      console.warn("Empty response from Claude, skipping");
    }

    return callbackData;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "```js\nconst x = 10\n```",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "can you help me debug the code i just pasted (Attachment: a265a)",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure, let me ask claude",
          action: "ASK_CLAUDE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i need to write a compelling cover letter, i've pasted my resume and bio. plz help (Attachment: b3e12)",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure, give me a sec",
          action: "ASK_CLAUDE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you help me create a 10-day itinerary that covers Tokyo, Kyoto, and Osaka, including must-see attractions, local cuisine recommendations, and transportation tips",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Yeah, give me a second to get that together for you...",
          action: "ASK_CLAUDE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i need to write a blog post about farming, can you summarize the discussion and ask claude to write a 10 paragraph blog post about it, citing sources at the end",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "No problem, give me a second to discuss it with Claude",
          action: "ASK_CLAUDE",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
