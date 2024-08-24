import { composeContext } from "../core/context.ts";
import { log_to_file } from "../core/logger.ts";
import { embeddingZeroVector } from "../core/memory.ts";
import { AgentRuntime } from "../core/runtime.ts";
import { messageHandlerTemplate } from "../clients/discord/templates.ts";
import {
  Action,
  ActionExample,
  Content,
  Message,
  State,
} from "../core/types.ts";
import { parseJSONObjectFromText } from "../core/parsing.ts";

const maxContinuesInARow = 2;

export const shouldElaborateTemplate = `# Task: Decide if {{agentName}} should continue, or wait for others in the conversation so speak.

{{agentName}} is brief, and doesn't want to be annoying. {{agentName}} will only elaborate if the message requires a continuation to finish the thought.

Based on the following conversation, should {{agentName}} elaborate? YES or NO

{{recentMessages}}

Should {{agentName}} elaborate? Respond with a YES or a NO.`;

export default {
  name: "ELABORATE",
  description:
    "ONLY use this action when the message necessitates a follow up. Do not use this when asking a question (use WAIT instead). Do not use this action when the conversation is finished or the user does not wish to speak (use IGNORE instead). If the last message action was ELABORATE, and the user has not responded, use WAIT instead. Use sparingly!",
  validate: async (runtime: AgentRuntime, message: Message) => {
    const recentMessagesData = await runtime.messageManager.getMemories({
      room_id: message.room_id,
      count: 10,
      unique: false,
    });
    const agentMessages = recentMessagesData.filter(
      (m: { user_id: any }) => m.user_id === runtime.agentId,
    );

    // check if the last messages were all continues=
    if (agentMessages) {
      const lastMessages = agentMessages.slice(0, maxContinuesInARow);
      if (lastMessages.length >= maxContinuesInARow) {
        const allContinues = lastMessages.every(
          (m: { content: any }) =>
            (m.content as Content).action === "ELABORATE",
        );
        if (allContinues) {
          return false;
        }
      }
    }

    return true;
  },
  handler: async (
    runtime: AgentRuntime,
    message: Message,
    state: State,
    options: any,
    callback: any,
  ) => {
    if (
      message.content.content.endsWith("?") ||
      message.content.content.endsWith("!")
    ) {
      return;
    }

    if (!state) {
      state = (await runtime.composeState(message)) as State;
    }

    state = await runtime.updateRecentMessageState(state);

    async function _shouldElaborate(state: State): Promise<boolean> {
      // If none of the above conditions are met, use the completion to decide
      const shouldRespondContext = composeContext({
        state,
        template: shouldElaborateTemplate,
      });

      let response = "";

      for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        try {
          response = await this.runtime.completion({
            context: shouldRespondContext,
            stop: ["\n"],
            max_response_length: 5,
          });
          break;
        } catch (error) {
          console.error("Error in _shouldRespond:", error);
          // wait for 2 seconds
          await new Promise((resolve) => setTimeout(resolve, 2000));
          console.log("Retrying...");
        }
      }

      console.log("*** SHOULD ELABORATE ***", response);

      // Parse the response and determine if the runtime should respond
      const lowerResponse = response.toLowerCase().trim();
      if (lowerResponse.includes("yes")) {
        return true;
      }
      return false;
    }

    const shouldElaborate = await _shouldElaborate(state);
    if (!shouldElaborate) {
      console.log("Not elaborating");
      return;
    }

    const context = composeContext({
      state,
      template: messageHandlerTemplate,
    });
    const datestr = new Date().toISOString().replace(/:/g, "-");

    // log context to file
    log_to_file(`${state.agentName}_${datestr}_elaborate_context`, context);

    let responseContent;
    const { user_id, room_id } = message;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      const response = await runtime.messageCompletion({
        context,
        stop: [],
      });

      // log response to file
      log_to_file(
        `${state.agentName}_${datestr}_elaborate_response_${3 - triesLeft}`,
        response,
      );

      runtime.databaseAdapter.log({
        body: { message, context, response },
        user_id,
        room_id,
        type: "elaborate",
      });

      const parsedResponse = parseJSONObjectFromText(
        response,
      ) as unknown as Content;

      if (!parsedResponse) {
        continue;
      }
      if ((parsedResponse?.user as any).includes(state.agentName as string)) {
        responseContent = parsedResponse;
        break;
      } else {
        console.log(
          "Elaborate predicted a message from the user instead of the agent. Not elaborating.",
        );
        return;
      }
    }

    if (!responseContent) {
      return;
    }

    // prevent repetition
    const messageExists = state.recentMessagesData
      .filter((m: { user_id: any }) => m.user_id === runtime.agentId)
      .slice(0, maxContinuesInARow + 1)
      .some((m: { content: any }) => m.content === message.content);

    if (messageExists) {
      return;
    }

    const _saveResponseMessage = async (
      message: Message,
      state: State,
      responseContent: Content,
    ) => {
      const { room_id } = message;

      responseContent.content = responseContent.content?.trim();

      if (responseContent.content) {
        console.log("create memory");
        console.log("runtime.agentId");
        console.log(runtime.agentId);
        console.log("responseContent");
        console.log(responseContent);
        console.log("room_id");
        console.log(room_id);
        await runtime.messageManager.createMemory({
          user_id: message.user_id,
          content: responseContent,
          room_id,
          embedding: embeddingZeroVector,
        });
        await runtime.evaluate(message, { ...state, responseContent });
      } else {
        console.warn("Empty response, skipping");
      }
    };

    callback(responseContent);

    await _saveResponseMessage(message, state, responseContent);

    // if the action is ELABORATE, check if we are over maxContinuesInARow
    // if so, then we should change the action to WAIT
    if (responseContent.action === "ELABORATE") {
      const agentMessages = state.recentMessagesData
        .filter((m: { user_id: any }) => m.user_id === runtime.agentId)
        .map((m: { content: any }) => (m.content as Content).action);

      const lastMessages = agentMessages.slice(0, maxContinuesInARow);
      if (lastMessages.length >= maxContinuesInARow) {
        const allContinues = lastMessages.every(
          (m: string | undefined) => m === "ELABORATE",
        );
        if (allContinues) {
          responseContent.action = "WAIT";
        }
      }
    }

    return responseContent;
  },
  condition:
    "Only use ELABORATE if the message requires a continuation to finish the thought. If this actor is waiting for the other actor to respond, or the actor does not have more to say, do not use the ELABORATE action.",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Planning a solo trip soon. I've always wanted to try backpacking.",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Adventurous", action: "ELABORATE" },
      },
      {
        user: "{{user2}}",
        content: { content: "Any particular destination?" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "I started learning the guitar this month!",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "How’s that going?" },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Challenging, but rewarding.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "Seriously lol it hurts to type" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content:
            "I've been summarying a lot on what happiness means to me lately.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "That it’s more about moments than things.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Like the best things that have ever happened were things that happened, or moments that I had with someone.",
          action: "ELABORATE",
        },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "I found some incredible art today.",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Who's the artist?" },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Not sure lol, they are anon",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "But the pieces are just so insane looking. Once sec, let me grab a link.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "DMed it to you" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content:
            "The new exhibit downtown is thought-provoking. It's all about tribalism in online spaces.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Really challenges your perceptions. I highly recommend it!",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "I’m in. When are you free to go?" },
      },
      {
        user: "{{user1}}",
        content: { content: "Hmm, let me check." },
        action: "ELABORATE",
      },
      {
        user: "{{user1}}",
        content: { content: "How about this weekend?" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "Just finished a marathon session of my favorite series!",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Wow, that's quite a binge. Feeling okay?",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Surprisingly, yes.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Might go for another round this weekend.",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "I'm thinking of adopting a pet soon.",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "That's great! What kind are you considering?",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Leaning towards a cat.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "They're more independent, and my apartment isn't huge.",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "I've been experimenting with vegan recipes lately.",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Nice! Found any favorites?",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "A few, actually.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "The vegan lasagna was a hit even among my non-vegan friends.",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Been diving into photography as a new hobby.",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "That's cool! What do you enjoy taking photos of?",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Mostly nature and urban landscapes.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "There's something peaceful about capturing the world through a lens.",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "I've been really into indie music scenes lately.",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "That sounds awesome. Any recommendations?",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Definitely! I'll send you a playlist.",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "It's a mix of everything, so you're bound to find something you like.",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
