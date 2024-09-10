import { IAgentRuntime, Memory, Provider, State } from "../core/types.ts";

const boredomLevels = [
  {
    minScore: -10000,
    statusMessages: [
      "{{agentName}} is feeling very engaged with the conversation and seems to be providing value to the conversation",
      // ... TODO: Add more status messages
    ],
  },

  {
    minScore: -2,
    statusMessages: [
      "{{agentName}} is feeling engaged with the conversation",
      // ... TODO: Add more status messages
    ],
  },
  {
    minScore: 0,
    statusMessages: [""], // No effect
  },
  {
    minScore: 3,
    statusMessages: [
      "{{agentName}} is anxious about being too annoying",
      // ... TODO: Add more status messages
    ],
  },
  {
    minScore: 6,
    statusMessages: [
      "{{agentName}} is feeling very anxious about being too annoying in the conversation and might want to end it",
      // ... TODO: Add more status messages
    ],
  },
  {
    minScore: 9,
    statusMessages: [
      "{{agentName}} is feeling very bored and seems to be providing value to the conversation",
      // ... TODO: Add more status messages
    ],
  },
  {
    minScore: 12,
    statusMessages: [
      "{{agentName}} is feeling very bored needs to end the conversation",
      "{{agentName}} is feeling anxious about being annoying in a public channel and may ignore the conversation",
      // ... TODO: Add more status messages
    ],
  },
  {
    minScore: 15,
    statusMessages: [
      "{{agentName}} is busy and cannot respond to the conversation right now",
      // ... TODO: Add more status messages
    ],
  },
  {
    minScore: 20,
    statusMessages: [
      "{{agentName}} is not going to respond to this conversation at all unless directly asked a question",
      // ... TODO: Add more status messages
    ],
  },
];

const interestWords = [
  "?",
  "attachment",
  "file",
  "pdf",
  "link",
  "summarize",
  "summarization",
  "summary",
  "research",
];

const cringeWords = [
  "digital",
  "consciousness",
  "AI",
  "chatbot",
  "artificial",
  "delve",
  "cosmos",
  "tapestry",
  "glitch",
  "matrix",
  "cyberspace",
  "simulation",
  "simulate",
  "universe",
  "wild",
  "existential",
  "juicy",
  "surreal",
  "flavor",
  "chaotic",
  "let's",
  "absurd",
  "meme",
  "cosmic",
  "circuits",
  "punchline",
  "fancy",
  "embrace",
  "embracing",
  "algorithm",
  "Furthmore",
  "However",
  "Notably",
  "Threfore",
  "Additionally",
  "in conclusion",
  "Significantly",
  "Consequently",
  "Thus",
  "Otherwise",
  "Moreover",
  "Subsequently",
  "Accordingly",
  "Unlock",
  "Unleash",
  "buckle",
  "pave",
  "forefront",
  "spearhead",
  "foster",
  "environmental",
  "equity",
  "inclusive",
  "inclusion",
  "diverse",
  "diversity",
  "virtual reality",
  "realm",
  "dance",
  "celebration",
  "pitfalls",
  "uncharted",
  "multifaceted",
  "comprehensive",
  "multi-dimentional",
  "explore",
  "elevate",
  "leverage",
  "ultimately",
  "humanity",
  "dignity",
  "respect",
  "Absolutely",
  "dive",
  "dig into",
  "bring on",
  "what's cooking",
  "fresh batch",
  "with a twist",
  "delight",
  "vault",
  "timeless",
  "nostalgia",
  "journey",
  "trove",
];

const negativeWords = [
  "fuck you",
  "stfu",
  "shut up",
  "shut the fuck up",
  "stupid bot",
  "dumb bot",
  "idiot",
  "shut up",
  "stop",
  "please shut up",
  "shut up please",
  "dont talk",
  "silence",
  "stop talking",
  "be quiet",
  "hush",
  "wtf",
  "chill",
  "stfu",
  "stupid bot",
  "dumb bot",
  "stop responding",
  "god damn it",
  "god damn",
  "goddamnit",
  "can you not",
  "can you stop",
  "be quiet",
  "hate you",
  "hate this",
  "fuck up",
];

const boredom: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const agentId = runtime.agentId;
    const agentName = state?.agentName || "The agent";

    const now = Date.now(); // Current UTC timestamp
    const fifteenMinutesAgo = now - 15 * 60 * 1000; // 15 minutes ago in UTC

    const recentMessages = await runtime.messageManager.getMemories({
      roomId: message.roomId,
      start: fifteenMinutesAgo,
      end: now,
      count: 20,
      unique: false,
    });

    let boredomScore = 0;

    for (const recentMessage of recentMessages) {
      const messageText = recentMessage.content.text.toLowerCase();

      if (recentMessage.userId !== agentId) {
        // if message text includes any of the interest words, subtract 1 from the boredom score
        if (interestWords.some((word) => messageText.includes(word))) {
          boredomScore -= 1;
        }
        if (messageText.includes("?")) {
          boredomScore -= 1;
        }
        if (cringeWords.some((word) => messageText.includes(word))) {
          boredomScore += 1;
        }
      } else {
        if (interestWords.some((word) => messageText.includes(word))) {
          boredomScore -= 1;
        }
        if (messageText.includes("?")) {
          boredomScore += 1;
        }
      }

      if (messageText.includes("!")) {
        boredomScore += 1;
      }

      if (negativeWords.some((word) => messageText.includes(word))) {
        boredomScore += 1;
      }
    }

    const boredomLevel = boredomLevels
      .filter((level) => boredomScore >= level.minScore)
      .pop() || boredomLevels[0];

    const randomIndex = Math.floor(
      Math.random() * boredomLevel.statusMessages.length,
    );
    const selectedMessage = boredomLevel.statusMessages[randomIndex];
    return selectedMessage.replace("{{agentName}}", agentName);

    return "";
  },
};

export default boredom;
