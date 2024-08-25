import { composeContext } from "../core/context.ts";
import { log_to_file } from "../core/logger.ts";
import { embeddingZeroVector } from "../core/memory.ts";
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
    "ONLY use this action when the message necessitates a follow up. Do not use this when asking a question (use WAIT instead). Do not use this action when the conversation is finished or the user does not wish to speak (use IGNORE instead). If the last message action was ELABORATE, and the user has not responded, use WAIT instead. Use sparingly.",
  validate: async (runtime: any, message: Message) => {
    console.log("Validating elaborate");
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
    runtime: any,
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
          response = await runtime.completion({
            context: shouldRespondContext,
            stop: ["\n"],
            max_response_length: 5,
          });
          break;
        } catch (error) {
          console.error("Error in _shouldElaborate:", error);
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
          content: "we're planning a solo backpacking trip soon",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "oh sick", action: "ELABORATE" },
      },
      {
        user: "{{user2}}",
        content: { content: "where are you going" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "i just got a guitar and started learning last month",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "maybe we can start a band soon lol" },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "i'm not very good yet, but i've been playing until my fingers hut",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "seriously lol it hurts to type" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content:
            "I've been reflecting a lot on what happiness means to me lately",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "That it’s more about moments than things",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Like the best things that have ever happened were things that happened, or moments that I had with someone",
          action: "ELABORATE",
        },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "i found some incredible art today",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "real art or digital art" },
      },
      {
        user: "{{user1}}",
        content: {
          content: "lol real art",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "the pieces are just so insane looking, one sec, let me grab a link",
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
            "the new exhibit downtown is rly cool, it's all about tribalism in online spaces",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "it really blew my mind, you gotta go",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "lol sure i'd go" },
      },
      {
        user: "{{user1}}",
        content: { content: "k i was thinking this weekend" },
        action: "ELABORATE",
      },
      {
        user: "{{user1}}",
        content: { content: "i'm free sunday, we could get a crew together" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "just finished the best anime i've ever seen",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "watched 40 hours of it in 2 days",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "damn, u ok",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "surprisingly yes",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "just found out theres a sequel, gg",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "i'm thinking of adopting a pet soon",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "what kind of pet",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "i'm leaning towards a cat",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "it'd be hard to take care of a dog in the city",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "i've been experimenting with vegan recipes lately",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "no thanks",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "no seriously, its so dank",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "you gotta try some of my food when you come out",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "so i've been diving into photography as a new hobby",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "oh awesome, what do you enjoy taking photos of",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "mostly nature and urban landscapes",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "there's something peaceful about capturing the world through a lens",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "i've been getting back into indie music",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "what have you been listening to",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "a bunch of random stuff i'd never heard before",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "i'll send you a playlist",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "i used to live in the city",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "bad traffic, bad air quality, tons of homeless people, no thx",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "ok dood",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "you kids today dont know the value of hard work",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "always on your phones",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "sure grandpa lets get you to bed",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "hey fren r u ok",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "u look sad",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "im ok sweetie mommy just tired",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "helo fr om mars",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "i com in pes",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "wat",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Yeah no worries, I get it, I've been crazy busy too",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "What have you been up to",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Anything fun or just the usual",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Been working on a new FPS game actually",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "Just toying around with something in three.js nothing serious",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Oh no, what happened",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Did Mara leave you lol",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "wtf no, I got into an argument with my roommate",
          action: "ELABORATE",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Living with people is just hard",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
