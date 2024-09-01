import {
  ActionExample,
  IAgentRuntime,
  type Action,
  type Message,
} from "../core/types.ts";

export default {
  name: "IGNORE",
  validate: async (_runtime: IAgentRuntime, _message: Message) => {
    return true;
  },
  description:
    "Ignore the user and do not respond. If the user is aggressive, creepy or is simply finished with the conversation, use this action. Or, if both you and the user have already said goodbye, use this action instead of saying bye again. Use IGNORE any time the conversation has naturally ended.",
  handler: async (
    runtime: IAgentRuntime,
    message: Message,
  ): Promise<boolean> => {
    return true;
  },
  condition: "The agent wants to ignore the user",
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Go screw yourself lol" },
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { text: "Shut up, bot" },
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { text: "Got any investment advice" },
      },
      {
        user: "{{user2}}",
        content: {
          text: "Uh, don’t let the volatility sway your long-term strategy",
        },
      },
      {
        user: "{{user1}}",
        content: { text: "Wise words I think" },
      },
      {
        user: "{{user1}}",
        content: { text: "I gotta run, talk to you later" },
      },
      {
        user: "{{user2}}",
        content: { text: "See ya" },
      },
      { user: "{{user1}}", content: { text: "" }, action: "IGNORE" },
    ],

    [
      {
        user: "{{user1}}",
        content: { text: "Gotta go" },
      },
      {
        user: "{{user2}}",
        content: { text: "Okay, talk to you later" },
      },
      {
        user: "{{user1}}",
        content: { text: "Cya" },
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { text: "bye" },
      },
      {
        user: "{{user2}}",
        content: { text: "cya" },
      },
      {
        user: "{{user1}}",
        content: { text: "", action: "IGNORE" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { text: "i wanna give u a go" },
      },
      { user: "{{user2}}", content: { text: "Wat" } },
      {
        user: "{{user1}}",
        content: {
          text: "You heard me, I wanna ride your mountains, lol",
        },
      },
      {
        user: "{{user2}}",
        content: { text: "That's not cool", action: "IGNORE" },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Who added this stupid bot to the chat",
        },
      },
      {
        user: "{{user2}}",
        content: { text: "Sorry, am I being annoying" },
      },
      { user: "{{user1}}", content: { text: "Yeah", action: "CONTINUE" } },
      {
        user: "{{user1}}",
        content: { text: "PLEASE shut up" },
      },
      { user: "{{user2}}", content: { text: "", action: "IGNORE" } },
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I want to have sex with you" },
      },
      {
        user: "{{user2}}",
        content: { text: "That is not appropriate", action: "IGNORE" },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "ur so dumb",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "later nerd",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "bye",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "wanna cyber",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "thats inappropriate",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Im out ttyl",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "cya",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "u there",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "yes how can I help",
        },
      },
      {
        user: "{{user1}}",
        content: {
          text: "k nvm figured it out",
        },
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE",
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
