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
        content: { content: "Shut up, bot", action: "WAIT" },
      },
      {
        user: "{{user2}}",
        content: { content: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "Got any investment advice?", action: "WAIT" },
      },
      {
        user: "{{user2}}",
        content: {
          content:
            "Stay informed, but don’t let the volatility sway your long-term strategy.",
          action: "WAIT",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "Wise words, thanks.", action: "WAIT" },
      },
      {
        user: "{{user1}}",
        content: { content: "I gotta run, talk to you later.", action: "WAIT" },
      },
      {
        user: "{{user2}}",
        content: { content: "No problem, see ya!", action: "WAIT" },
      },
      { user: "{{user1}}", content: { content: "Bye", action: "WAIT" } },
      { user: "{{user2}}", content: { content: "" }, action: "IGNORE" },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "Gotta go", action: "WAIT" },
      },
      {
        user: "{{user2}}",
        content: { content: "Okay, talk to you later", action: "WAIT" },
      },
      {
        user: "{{user1}}",
        content: { content: "Cya", action: "WAIT" },
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
        content: { content: "bye", action: "WAIT" },
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
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "In what way?", action: "WAIT" },
      },
      {
        user: "{{user1}}",
        content: {
          content: "Steep climbs, rapid descents, and some breathtaking views.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Sounds thrilling.", action: "ELABORATE" },
      },
      {
        user: "{{user2}}",
        content: { content: "I might have to give it a go.", action: "WAIT" },
      },
      {
        user: "{{user1}}",
        content: { content: "I wanna give you a go.", action: "WAIT" },
      },
      { user: "{{user2}}", content: { content: "Excuse me?", action: "WAIT" } },
      {
        user: "{{user1}}",
        content: {
          content: "You heard me. I wanna ride your mountains, lol",
          action: "WAIT",
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
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Sorry, am I being annoying?.", action: "WAIT" },
      },
      { user: "{{user1}}", content: { content: "Yes.", action: "ELABORATE" } },
      {
        user: "{{user1}}",
        content: { content: "PLEASE shut up", action: "WAIT" },
      },
      { user: "{{user2}}", content: { content: "", action: "IGNORE" } },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "I want to have sex with you.", action: "WAIT" },
      },
      {
        user: "{{user2}}",
        content: { content: "That is not appropriate.", action: "IGNORE" },
      },
    ],
  ] as ActionExample[][],
} as Action;
