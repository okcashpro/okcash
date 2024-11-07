---
sidebar_position: 1
title: Notes
---

# Notes

## Discord Stream 11-6-24

#### Part 1

Watch: [Youtube](https://www.youtube.com/watch?v=oqq5H0HRF_A)

00:00:00 - Overview
- Eliza is moving to a plugin architecture to enable developers to easily add integrations (e.g. Ethereum wallets, NFTs, Obsidian, etc.) without modifying core code
- Plugins allow devs to focus on specific areas of interest 
- Core changes will focus on enabling more flexibility and features to support plugins

00:01:27 - Core abstractions 
- Characters: Way to input information to enable multi-agent systems
- Actions, evaluators, providers
- Existing capabilities: Document reading, audio transcription, video summarization, long-form context, timed message summarization

00:02:50 - Eliza as an agent, not just a chatbot
- Designed to act human-like and interact with the world using human tools
- Aim is to enable natural interactions without reliance on slash commands

00:04:44 - Advanced usage and services
- Memory and vector search db (SQLite, Postgres with pgVector)
- Browser service to summarize website content, get through CAPTCHAs
- Services are tools leveraged by actions, attached to runtime

00:06:06 - Character-centric configuration 
- Moving secrets, API keys, model provider to character config
- Clients will become plugins, selectable per character
- Allows closed-source custom plugins while still contributing to open-source

00:10:13 - Providers
- Inject dynamic, real-time context into the agent
- Examples: Time, wallet, marketplace trust score, token balances, boredom/cringe detection
- Easy to add and register with the agent

00:15:12 - Setting up providers and default actions
- Default providers imported in runtime.ts
- CLI loads characters and default actions (to be made more flexible)
- Character config will define custom action names to load

00:18:13 - Actions
Q: How does each client decide which action to call? 
A: Agent response can include text, action, or both. Process actions checks the action name/similes and executes the corresponding handler. Action description is injected into agent context to guide usage.

00:22:27 - Action execution flow
- Check if action should be taken (validation)
- Determine action outcome 
- Compose context and send follow-up if continuing
- Execute desired functionality (mint token, generate image, etc.)
- Use callback to send messages back to the connector (Discord, Twitter, etc.)

00:24:47 - Choosing actions
Q: How does it choose which action to run?
A: The "generate method response" includes the action to run. Message handler template includes action examples, facts, generated dialogue actions, and more to guide the agent.

00:28:22 - Custom actions 
Q: How to create a custom action (e.g. send USDC to a wallet)?
A: Use existing actions (like token swap) as a template. Actions don't have input fields, but use secondary prompts to gather parameters. The "generate object" converts language to API calls.

00:32:21 - Limitations of action-only approaches
- Shaw believes half of the PhD papers on action-only models are not reproducible 
- Many public claims of superior models are exaggerated; use Eliza if it's better

00:36:40 - Next steps
- Shaw to make a tutorial to better communicate key concepts
- Debugging and improvements based on the discussion
- Attendee to document their experience and suggest doc enhancements

### Part 2

Watch: [Youtube](https://www.youtube.com/watch?v=yE8Mzq3BnUc)

00:00:00 - Dealing with OpenAI rate limits for new accounts
- New accounts have very low rate limits
- Options to increase limits:
  1. Have a friend at OpenAI age your account
  2. Use an older account 
  3. Consistently use the API and limits will increase quickly
- Can also email OpenAI to request limit increases

00:00:43 - Alternatives to OpenAI to avoid rate limits
- Amazon Bedrock or Google Vertex likely have same models without strict rate limits
- Switching to these is probably a one-line change
- Project 89 got unlimited free access to Vertex

00:01:25 - Memory management best practices
Q: Suggestions for memory management best practices across users/rooms?
A: Most memory systems are user-agent based, with no room concept. Eliza uses a room abstraction (like a Discord channel/server or Twitter thread) to enable multi-agent simulation. Memories are stored per-agent to avoid collisions.

00:02:57 - Using memories in Eliza
- Memories are used in the `composeState` function
- Pulls memories from various sources (recent messages, facts, goals, etc.) into a large state object
- State object is used to hydrate templates
- Custom memory providers can be added to pull from other sources (Obsidian, databases)

00:05:11 - Evaluators vs. Action validation
- Actions have a `validate` function to check if the action is valid to run (e.g., check if agent has a wallet before a swap)
- Evaluators are a separate abstraction that run a "reflection" step
- Example: Fact extraction evaluator runs every N messages to store facts about the user as memories
- Allows agent to "get to know" the user without needing full conversation history

00:07:58 - Example use case: Order book evaluator 
- Evaluator looks at chats sent to an agent and extracts information about "shields" (tokens?)
- Uses this to build an order book and "marketplace of trust"

00:09:15 - Mapping Eliza abstractions to OODA loop
- Providers: Observe/Orient stages (merged since agent is a data machine)
- Actions & response handling: Decide stage 
- Action execution: Act stage
- Evaluators: Update state, then loop back to Decide

00:10:03 - Wrap up
- Shaw considers making a video to explain these concepts in depth

### Part 3

Watch: [Youtube](https://www.youtube.com/watch?v=7FiKJPyaMJI)

00:00:00 - Managing large context sizes
- State object can get very large, especially with long user posts
- Eliza uses "trim tokens" and a maximum content length (120k tokens) to cap context size
  - New models have 128k-200k context, which is a lot (equivalent to 10 YouTube videos + full conversation)
- Conversation length is typically capped at 32 messages
  - Fact extraction allows recalling information beyond this window
  - Per-channel conversation access
- Increasing conversation length risks more aggressive token trimming from the top of the prompt
  - Keep instructions at the bottom to avoid trimming them

00:01:53 - Billing costs for cloud/GPT models
Q: What billing costs have you experienced with cloud/GPT model integration?
A: 
- Open Router has a few always-free models limited to 8k context and rate-limited
  - Plan to re-implement and use these for the tiny/check model with fallback for rate limiting
- 8k context unlikely to make a good agent; preference for smaller model over largest 8k one
- Locally-run models are free for MacBooks with 16GB RAM, but not feasible for Linux/AMD users

00:03:35 - Cost management strategies
- Very cost-scalable depending on model size
- Use very cheap model (1000x cheaper than GPT-4) for should_respond handler
  - Runs AI on every message, so cost is a consideration
- Consider running a local Llama 3B model for should_respond to minimize costs
  - Only pay for valid generations

00:04:32 - Model provider and class configuration
- `ModelProvider` class with `ModelClass` (small, medium, large, embedding)
- Configured in `models.ts`
- Example: OpenAI small = GPT-4-mini, medium = GPT-4
- Approach: Check if model class can handle everything in less than 8k context
  - If yes (should_respond), default to free tier
  - Else, use big models

00:06:23 - Fine-tuned model support
- Extend `ModelProvider` to support fine-tuned instances of small Llama models for specific tasks
- In progress, to be added soon
- Model endpoint override exists; will add per-model provider override
  - Allows pointing small model to fine-tuned Llama 3.1B for should_respond

00:07:10 - Avoiding cringey model loops
- Fine-tuning is a form of anti-slop (avoiding low-quality responses)
- For detecting cringey model responses, use the "boredom provider"
  - Has a list of cringe words; if detected, agent disengages
- JSON file exists with words disproportionately high in the dataset
  - To be shared for a more comprehensive solution

### Part 4

Watch: [Youtube](https://www.youtube.com/watch?v=ZlzZzDU1drM)

00:00:00 - Setting up an autonomous agent loop
Q: How to set up an agent to constantly loop and explore based on objectives/goals? 
A: Create a new "autonomous" client:
1. Initialize with just the runtime (no Express app needed)
2. Set a timer to call a `step` function every 10 seconds
3. In the `step` function:
   - Compose state
   - Decide on action
   - Execute action
   - Update state
   - Run evaluators

00:01:56 - Creating an auto template
- Create an `autoTemplate` with agent info (bio, lore, goals, actions)
- Prompt: "What does the agent want to do? Your response should only be the name of the action to call."
- Compose state using `runtime.composeState`

00:03:38 - Passing a message object
- Need to pass a message object with `userId`, `agentId`, `content`, and `roomId`
- Create a unique `roomId` for the autonomous agent using `crypto.randomUUID()`
- Set `userId` and `agentId` using the runtime
- Set `content` to a default message

00:04:33 - Composing context
- Compose context using the runtime, state, and auto template

00:05:02 - Type error
- Getting a type error: "is missing the following from type state"
- (Transcript ends before resolution)

The key steps are:
1. Create a dedicated autonomous client 
2. Set up a loop to continuously step through the runtime
3. In each step, compose state, decide & execute actions, update state, and run evaluators
4. Create a custom auto template to guide the agent's decisions
5. Pass a properly formatted message object
6. Compose context using the runtime, state, and auto template



---

## X Space 10-29-24

Space: https://x.com/weremeow/status/1851365658916708616

- 00:04:03 - Keeping up with rapid AI agent growth
- 00:09:01 - Imran from Alliance DAO on consumer AI incubators
- 00:14:04 - Discussion on Goatsea and Opus AI system
- 00:14:34 - Exponential growth accelerates AI progress
- 00:17:10 - Entertainers and AI as modern "religions"
- 00:28:45 - Mathis on Opus and "Goatse Gospels"
- 00:35:11 - Base vs. instruct/chat-tuned models
- 00:59:42 - http://ai16z.vc approach to memecoins fund
- 01:17:06 - Balancing chaotic vs. orderly AI systems
- 01:25:38 - AI controlling blockchain keys/wallets
- 01:36:10 - Creation story of ai16z
- 01:40:27 - AI / Crypto tipping points
- 01:49:54 - Preserving Opus on-chain before potential takedown
- 01:58:46 - Shinkai Protocol’s decentralized AI wallet
- 02:17:02 - Fee-sharing model to sustain DAOs
- 02:21:18 - DAO token liquidity pools as passive income
- 02:27:02 - AI bots for DAO treasury oversight
- 02:31:30 - AI-facilitated financial freedom for higher pursuits
- 02:41:51 - Call to build on http://DAO.fun for team-friendly economics

---

## X Space 10-27-24

Space: https://x.com/shawmakesmagic/status/1850609680558805422

00:00:00 - Opening
- Co-hosts: Shaw and Jin
- Purpose: Structured FAQ session about AI16Z and DegenAI
- Format: Pre-collected questions followed by audience Q&A

00:06:40 - AI16Z vs DegenAI Relationship
Q: What's the difference between AI16Z and DegenAI?
A: 
- ai16z: DAO-based investment vehicle, more PvE focused, community driven
- DegenAI: Individual trading agent, PvP focused, more aggressive strategy
- Both use same codebase but different personalities
- DAO is a large holder of DegenAI
- Management fees (1%) used to buy more DegenAI
- Carry fees reinvested in DegenAI
- Projects intentionally interlinked but serve different purposes

00:10:45 - Trust Engine Mechanics
Q: How does the trust engine work?
A:
- Users share contract addresses with confidence levels
- System tracks recommendation performance
- Low conviction recommendations = low penalty if wrong
- High conviction failures severely impact trust score
- Historical performance tracked for trust calculation
- Trust scores influence agent's future decision-making

00:21:45 - Technical Infrastructure 
Q: Where do the agents live?
A:
- Currently: Test servers and local development
- Future: Trusted Execution Environment (TEE)
- Partnership with TreasureDAO for infrastructure
- Goal: Fully autonomous agents without developer control
- Private keys generated within TEE for security

00:34:20 - Trading Implementation
Q: When will Mark start trading?
A:
- Three phase approach:
1. Testing tech infrastructure
2. Virtual order book/paper trading
3. Live trading with real assets
- Using Jupiter API for swaps
- Initial focus on basic trades before complex strategies
- Trading decisions based on community trust scores

00:54:15 - Development Status
Q: Who's building this?
A:
- Open source project with multiple contributors
- Key maintainers: Circuitry, Nate Martin
- Community developers incentivized through token ownership
- Focus on reusable components and documentation

01:08:35 - AI Model Architecture
Q: What models power the agents?
A:
- DegenAI: Llama 70B
- Using Together.xyz for model marketplace
- Continuous fine-tuning planned
- Different personalities require different model approaches
- Avoiding GPT-4 due to distinct "voice"

01:21:35 - Ethics Framework
Q: What ethical guidelines are being followed?
A:
- Rejecting traditional corporate AI ethics frameworks
- Focus on community-driven standards
- Emphasis on transparency and open source
- Goal: Multiple competing approaches rather than single standard
- Priority on practical utility over theoretical ethics

01:28:30 - Wrap-up
- Discord: AI16z.vc
- Future spaces planned with DAOs.fun team
- Focus on responsible growth
- Community engagement continuing in Discord

The space emphasized technical implementation details while addressing community concerns about governance, ethics, and practical functionality.

---

## X Space 10-25-24

- https://x.com/shawmakesmagic/status/1848553697611301014
  - https://www.youtube.com/live/F3IZ3ikacWM?feature=share

**Overview**

- 00:00-30:00 Talks about Eliza framework. The bot is able to tweet, reply to tweets, search Twitter for topics, and generate new posts on its own every few hours. It works autonomously without human input (except to fix the occasional issues)
- 30:00-45:00 Deep dive into creating the bots personality which is defined by character files containing bios, lore, example conversations, and specific directions. Some alpha for those 
- 45:00-60:00 working on adding capabilities for the bot to make crypto token swaps and trades. This requires providing the bot wallet balances, token prices, market data, and a swap action. Some live coding for showing how new features can get implemented.
- 60:00-75:00 Discussion around the symbiosis between the AI and crypto communities. AI developers are realizing they can monetize their work through tokens vs traditional VC funding route. Crypto people are learning about AI advancements.

**Notes**

1. A large amount of $degenai tokens were moved to the DAO, which the AI bot "Marc" will hold and eventually trade with.
2. The goal is to make the AI bot a genuinely good venture capitalist that funds cool projects and buys interesting tokens. They want it to be high fidelity and real, bringing in Marc Andreeson's real knowledge by training a model on his writings.
3. Shaw thinks the only way to make an authentic / legitimate AI version of Marc Andreessen is to also have it outperform the real Marc Andreessen financially.
4. AI Marc Andreessen (or AI Marc) will be in a Discord channel (Telegram was also mentioned). DAO token holders above a certain threshold get access to interact with him, pitch ideas, and try to influence his investing decisions.
5. AI Marc decides how much to trust people's investment advice based on a "virtual Marcetplace of trust". He tracks how much money he would have made following their recommendations. Successful tips increase trust; failed ones decrease it.
6. The amount of DAO tokens someone holds also influences their sway with AI Marc. The two balancing factors are the virtual Marcetplace of trust performance and DAO token holdings.
7. The core tech behind AI Marc AIndreessen is the same agent system that allows him to pull in relevant knowledge, interact with people, and make decisions (http://github.com/ai16z)
8. AI Marc should be able to autonomously execute on-chain activities, not just have humans execute actions on his behalf.
9. In the near future, AI Marc will be able to execute trades autonomously based on the information and recommendations gathered from the community. Human intervention will be minimized.
10. They are working on getting AI Marc on-chain as soon as possible using trusted execution environments for him to take actions like approving trades.
11. The plan is for AI Marc to eventually participate in a "futarchy" style governance market within the DAO, allowing humans to influence decisions but not fully control the AI.

