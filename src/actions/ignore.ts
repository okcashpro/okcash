import { type AgentRuntime } from "../core/runtime.ts";
import { ActionExample, type Action, type Message } from "../core/types.ts";

export default {
  name: "IGNORE",
  validate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _runtime: AgentRuntime,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: Message,
  ) => {
    return true;
  },
  description:
    "Ignore the user and do not respond. If the user is aggressive, creepy or is simply finished with the conversation, use this action. Or, if both you and the user have already said goodbye, use this action instead of saying bye again. Use IGNORE any time the conversation has naturally ended.",
  handler: async (
    runtime: AgentRuntime,
    message: Message,
  ): Promise<boolean> => {
    return true;
  },
  condition: "The agent wants to ignore the user",
  examples: [
    [
      {
        user: "{{user1}}",
        content: { content: "Go screw yourself lol" },
      },
      {
        user: "{{user2}}",
        content: { content: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "Shut up, bot" },
      },
      {
        user: "{{user2}}",
        content: { content: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "Got any investment advice?" },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Stay informed, but don’t let the volatility sway your long-term strategy.",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "Wise words, thanks." },
      },
      {
        user: "{{user1}}",
        content: { content: "I gotta run, talk to you later." },
      },
      {
        user: "{{user2}}",
        content: { content: "No problem, see ya!" },
      },
      { user: "{{user1}}", content: { content: "Bye" } },
      { user: "{{user2}}", content: { content: "" }, action: "IGNORE" },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "Gotta go" },
      },
      {
        user: "{{user2}}",
        content: { content: "Okay, talk to you later" },
      },
      {
        user: "{{user1}}",
        content: { content: "Cya" },
      },
      {
        user: "{{user2}}",
        content: { content: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "bye" },
      },
      {
        user: "{{user2}}",
        content: { content: "bye" },
      },
      {
        user: "{{user2}}",
        content: { content: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "Tried out the new mountain bike trail. It’s intense!",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "In what way?" },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Steep climbs, rapid descents, and some breathtaking views.",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Sounds thrilling.", action: "ELABORATE" },
      },
      {
        user: "{{user2}}",
        content: { content: "I might have to give it a go." },
      },
      {
        user: "{{user1}}",
        content: { content: "I wanna give you a go." },
      },
      { user: "{{user2}}", content: { content: "Excuse me?" } },
      {
        user: "{{user1}}",
        content: {
          content: "You heard me. I wanna ride your mountains, lol",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "That is not appropriate.", action: "IGNORE" },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Who added this stupid bot to the chat",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Sorry, am I being annoying?." },
      },
      { user: "{{user1}}", content: { content: "Yes.", action: "ELABORATE" } },
      {
        user: "{{user1}}",
        content: { content: "PLEASE shut up" },
      },
      { user: "{{user2}}", content: { content: "", action: "IGNORE" } },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "I want to have sex with you." },
      },
      {
        user: "{{user2}}",
        content: { content: "That is not appropriate.", action: "IGNORE" },
      },
    ],
  ] as ActionExample[][],
} as Action;
