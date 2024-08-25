import { type AgentRuntime } from "../core/runtime.ts";
import { ActionExample, type Action, type Message } from "../core/types.ts";

export default {
  name: "IGNORE",
  validate: async (_runtime: AgentRuntime, _message: Message) => {
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
        content: { content: "Got any investment advice" },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Uh, don’t let the volatility sway your long-term strategy",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "Wise words I think" },
      },
      {
        user: "{{user1}}",
        content: { content: "I gotta run, talk to you later" },
      },
      {
        user: "{{user2}}",
        content: { content: "See ya" },
      },
      { user: "{{user1}}", content: { content: "" }, action: "IGNORE" },
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
        content: { content: "cya" },
      },
      {
        user: "{{user1}}",
        content: { content: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "i wanna give u a go" },
      },
      { user: "{{user2}}", content: { content: "Wat" } },
      {
        user: "{{user1}}",
        content: {
          content: "You heard me, I wanna ride your mountains, lol",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "That's not cool", action: "IGNORE" },
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
        content: { content: "Sorry, am I being annoying" },
      },
      { user: "{{user1}}", content: { content: "Yeah", action: "ELABORATE" } },
      {
        user: "{{user1}}",
        content: { content: "PLEASE shut up" },
      },
      { user: "{{user2}}", content: { content: "", action: "IGNORE" } },
    ],
    [
      {
        user: "{{user1}}",
        content: { content: "I want to have sex with you" },
      },
      {
        user: "{{user2}}",
        content: { content: "That is not appropriate", action: "IGNORE" },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "ur so dumb",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "later nerd",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "bye",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "wanna cyber",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "thats inappropriate",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "Im out ttyl",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "cya",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          content: "u there",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "yes how can I help",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content: "k nvm figured it out",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "",
          action: "IGNORE",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
