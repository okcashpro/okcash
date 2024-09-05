import { composeContext } from "../../../core/context.ts";
import { log_to_file } from "../../../core/logger.ts";
import { embeddingZeroVector } from "../../../core/memory.ts";
import { getActorDetails } from "../../../core/messages.ts";
import { parseJSONObjectFromText } from "../../../core/parsing.ts";
import { AgentRuntime } from "../../../core/runtime.ts";
import {
  Action,
  ActionExample,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Media,
  Memory,
  State,
} from "../../../core/types.ts";

export const summarizationTemplate = `# Summarized so far (we are adding to this)
{{currentSummary}}

# Current conversation chunk we are summarizing (includes attachments)
{{memoriesWithAttachments}}

Summarization objective: {{objective}}

# Instructions: Summarize the conversation so far. Return the summary, as well as a list of attachments that should be included in the summary. Do not acknowledge this request, just summarize and continue the existing summary if there is one. Capture any important details to the objective.
\`\`\`json
{
  "summary": "<The summary of the current conversation section, continuing from the current summary.>",
}
\`\`\`
`;

export const dateRangeTemplate = `# Messages we are summarizing (the conversation is continued after this)
{{recentMessages}}

# Instructions: {{senderName}} is requesting a summary of the conversation. Your goal is to determine their objective, along with the range of dates that their request covers.
The "objective" is a short description of what the user wants to summarize.
The "start" and "end" are the range of dates that the user wants to summarize, relative to the current time. The start and end should be relative to the current time, and measured in seconds, minutes, hours and days. The format is "2 days ago" or "3 hours ago" or "4 minutes ago" or "5 seconds ago", i.e. "<integer> <unit> ago".
If you aren't sure, you can use a default range of "0 minutes ago" to "2 hours ago" or more. Better to err on the side of including too much than too little.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "objective": "<What the user wants to summarize>",
  "start": "0 minutes ago",
  "end": "2 hours ago"
}
\`\`\`
`;

const getDateRange = async (
  runtime: IAgentRuntime,
  message: Memory,
  state: State,
) => {
  state = (await runtime.composeState(message)) as State;

  const context = composeContext({
    state,
    template: dateRangeTemplate,
  });

  for (let i = 0; i < 5; i++) {
    const response = await runtime.completion({
      model: "gpt-4o-mini",
      context,
    });
    // try parsing to a json object
    const parsedResponse = parseJSONObjectFromText(response) as {
      objective: string;
      start: string | number;
      end: string | number;
    } | null;
    // see if it contains objective, start and end
    if (parsedResponse) {
      if (
        parsedResponse.objective &&
        parsedResponse.start &&
        parsedResponse.end
      ) {
        // TODO: parse start and end into timestamps
        const startIntegerString = (parsedResponse.start as string).match(
          /\d+/,
        )?.[0];
        const endIntegerString = (parsedResponse.end as string).match(
          /\d+/,
        )?.[0];

        // parse multiplier
        const multipliers = {
          seconds: 1,
          minutes: 60,
          hours: 3600,
          days: 86400,
        };

        const startMultiplier = (parsedResponse.start as string).match(
          /seconds|minutes|hours|days/,
        )?.[0];
        const endMultiplier = (parsedResponse.end as string).match(
          /seconds|minutes|hours|days/,
        )?.[0];

        const startInteger = startIntegerString
          ? parseInt(startIntegerString)
          : 0;
        const endInteger = endIntegerString ? parseInt(endIntegerString) : 0;

        // multiply by multiplier
        let startTime =
          startInteger *
          multipliers[startMultiplier as keyof typeof multipliers] *
          1000;
        let endTime =
          endInteger *
          multipliers[endMultiplier as keyof typeof multipliers] *
          1000;

        // if endTime is 0, set it to 2 hours ago
        if (endTime === 0) {
          endTime = Date.now() - 2 * 3600 * 1000;
        }

        // get the current time and subtract the start and end times
        parsedResponse.start = Date.now() - startTime;
        parsedResponse.end = Date.now() - endTime;

        return parsedResponse;
      }
    }
  }
};

const summarizeAction = {
  name: "SUMMARIZE",
  description: "Summarizes the conversation and attachments.",
  validate: async (runtime: AgentRuntime, message: Memory, state: State) => {
    if (message.content.source !== "discord") {
      return false;
    }
    // only show if one of the keywords are in the message
    const keywords: string[] = [
      "summarize",
      "summarization",
      "summary",
      "recap",
      "report",
      "overview",
      "review",
      "rundown",
      "wrap-up",
      "brief",
      "debrief",
      "abstract",
      "synopsis",
      "outline",
      "digest",
      "abridgment",
      "condensation",
      "encapsulation",
      "essence",
      "gist",
      "main points",
      "key points",
      "key takeaways",
      "bulletpoint",
      "highlights",
      "tldr",
      "tl;dr",
      "in a nutshell",
      "bottom line",
      "long story short",
      "sum up",
      "sum it up",
      "short version",
      "bring me up to speed",
      "catch me up",
    ];
    return keywords.some((keyword) =>
      message.content.text.toLowerCase().includes(keyword.toLowerCase()),
    );
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

    let callbackData: Content = {
      text: "", // fill in later
      action: "SUMMARIZATION_RESPONSE",
      source: message.content.source,
      attachments: [],
    };
    const { roomId } = message;

    // 1. extract date range from the message
    const dateRange = await getDateRange(runtime, message, state);
    if (!dateRange) {
      console.error("Couldn't get date range from message");
      return;
    }

    const { objective, start, end } = dateRange;

    // 2. get these memories from the database
    const memories = await runtime.messageManager.getMemories({
      roomId,
      start: new Date(start),
      end: new Date(end),
    });

    const actors = await getActorDetails({
      runtime: runtime as AgentRuntime,
      roomId,
    });

    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    const formattedMemories = memories
      .map((memory) => {
        const attachments = memory.content.attachments
          ?.map((attachment: Media) => {
            return `---\nAttachment: ${attachment.id}\n${attachment.description}\n${attachment.text}\n---`;
          })
          .join("\n");
        return `${actorMap.get(memory.userId)?.name ?? "Unknown User"} (${actorMap.get(memory.userId)?.username ?? ""}): ${memory.content.text}\n${attachments}`;
      })
      .join("\n");

    // format the messages and attachments into a string
    let memoryString = "";

    let currentSummary = "";
    const chunkSize = runtime.getSetting("OPENAI_API_KEY") ? 100000 : 3500;

    const chunks = await runtime.splitChunks(
      memoryString,
      chunkSize,
      0,
      "gpt-4o-mini",
    );

    const datestr = new Date().toISOString().replace(/:/g, "-");

    state.memoriesWithAttachments = formattedMemories;
    state.objective = objective;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      state.currentSummary = currentSummary;
      state.currentChunk = chunk;
      const context = composeContext({
        state,
        // make sure it fits, we can pad the tokens a bit
        template: runtime.trimTokens(
          summarizationTemplate,
          chunkSize + 500,
          "gpt-4o-mini",
        ),
      });

      log_to_file(
        `${state.agentName}_${datestr}_summarization_context`,
        context,
      );

      // TODO: if this is llama, we need to do that instead
      const summary = await runtime.completion({
        model: "gpt-4o-mini",
        context,
      });

      log_to_file(
        `${state.agentName}_${datestr}_summarization_response_${i}`,
        summary,
      );

      currentSummary = currentSummary + "\n" + summary;
    }

    // log context to file
    log_to_file(
      `${state.agentName}_${datestr}_summarization_summary`,
      currentSummary,
    );

    // call callback with it -- twitter and discord client can separately handle what to do, IMO we may way to add gists so the agent can post a gist and link to it later

    if (!currentSummary) {
      console.error("No summary found, that's not good!");
      return;
    }

    callbackData.text = currentSummary;

    const response = {
      userId,
      content: callbackData,
      roomId,
      embedding: embeddingZeroVector,
    };

    if (currentSummary.trim()) {
      await runtime.messageManager.createMemory(response);
      await runtime.evaluate(message, state);
    } else {
      console.warn("Empty response from Claude, skipping");
    }

    return callbackData;
  },
  condition:
    "The agent needs assistance from Claude to better respond to the user's request.",
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
          content:
            "can you give me a detailed report on what we're talking about?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure, no problem, give me a minute to get that together for you",
          action: "SUMMARIZE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "please summarize the conversation we just had and include this blogpost i'm linking (Attachment: b3e12)",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure, give me a sec",
          action: "SUMMARIZE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Can you summarize what moon and avf are talking about?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Yeah, just hold on a second while I get that together for you...",
          action: "SUMMARIZE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "i need to write a blog post about farming, can you summarize the discussion from a few hours ago?",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "no probblem, give me a few minutes to read through everything",
          action: "SUMMARIZE",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;

export default summarizeAction;
