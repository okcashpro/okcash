import { type AgentRuntime } from "../runtime.ts"
import { type Action, type Message } from "../types.ts"

export default {
  name: "WAIT",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate: async (_runtime: AgentRuntime, _message: Message) => {
    return true;
  },
  description:
    "Do nothing and wait for another person to reply to the last message, or to continue their thought. For cases such as if the actors have already said goodbye to each other, use the ignore action instead.",
  handler: async (
    runtime: AgentRuntime,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: Message,
  ): Promise<boolean> => {
    if (runtime.debugMode) {
      console.log("Waited.");
    }
    return true;
  },
  condition: "The agent wants to wait for the user to respond",
  examples: [
    // 1 long, 1 short example of exclamation
    [
      {
        user: "{{user1}}",
        content: {
          content: "I finally finished that book I've been reading for weeks!",
          action: "WAIT",
        },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content:
            "I caught a great film last night about pollution that really made me think.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Worth watching?", action: "WAIT" },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "Eh, maybe just watch a synopsis. Interesting content, but slow.",
          action: "WAIT",
        },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "I've been trying out pottery recently.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "That sounds therapeutic. Made anything interesting?",
          action: "WAIT",
        },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: { content: "I'm so frustrated!", action: "ELABORATE" },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "I've really been struggling to balance work and personal life.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "I can relate. Developed any helpful coping mechanisms?",
          action: "WAIT",
        },
      },
      {
        user: "{{user1}}",
        content: {
          content:
            "Haha, well, just trying to set strict boundaries. Easier said than done, though.",
          action: "WAIT",
        },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Discovered a new dollar store downtown. It's seriously a hidden gem.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Oh sick!", action: "ELABORATE" },
      },
      {
        user: "{{user2}}",
        content: { content: "What makes it special?", action: "WAIT" },
      },
      {
        user: "{{user1}}",
        content: {
          content: "They sell espresso for a dollar.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: { content: "Dang, I must check it out.", action: "WAIT" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content: "I stumbled upon an old bookstore in the downtown area.",
          action: "WAIT",
        },
      },
      {
        user: "{{user2}}",
        content: {
          content: "Old bookstore? Find anything good?",
          action: "WAIT",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "Yeah but I forgot my wallet.", action: "WAIT" },
      },
      {
        user: "{{user3}}",
        content: {
          content: "Couldn't just pay with your phone?",
          action: "WAIT",
        },
      },
      {
        user: "{{user1}}",
        content: { content: "Nope, cash only", action: "WAIT" },
      },
    ],

    [
      {
        user: "{{user1}}",
        content: {
          content:
            "Experimented with a new recipe and it was a disaster. Cooking is harder than it looks.",
          action: "WAIT",
        },
      },
    ],
  ],
} as Action;
