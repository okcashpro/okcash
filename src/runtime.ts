import { addHeader, composeContext } from "./context.ts";
import {
  defaultEvaluators,
  evaluationTemplate,
  formatEvaluatorConditions,
  formatEvaluatorExamples,
  formatEvaluatorNames,
  formatEvaluators,
} from "./evaluators.ts";
import logger from "./logger.ts";
import { MemoryManager } from "./memory.ts";
import {
  Content,
  Goal,
  Provider,
  State,
  type Action,
  type Evaluator,
  type Message,
} from "./types.ts";
import { parseJsonArrayFromText } from "./parsing.ts";

import {
  composeActionExamples,
  formatActionConditions,
  formatActionNames,
  formatActions,
} from "./actions.ts";
import { UUID } from "crypto";
import { zeroUuid } from "./constants.ts";
import { DatabaseAdapter } from "./database.ts";
import { formatFacts } from "./evaluators/fact.ts";
import { formatGoalsAsString, getGoals } from "./goals.ts";
import { formatLore, getLore } from "./lore.ts";
import { formatActors, formatMessages, getActorDetails } from "./messages.ts";
import { defaultProviders, getProviders } from "./providers.ts";
import { type Actor, type Memory } from "./types.ts";

/**
 * Represents the runtime environment for an agent, handling message processing,
 * action registration, and interaction with external services like OpenAI and Supabase.
 */
export class AgentRuntime {
  /**
   * Default count for recent messages to be kept in memory.
   * @private
   */
  readonly #conversationLength = 32 as number;
  /**
   * The ID of the agent
   */
  agentId: UUID = zeroUuid;
  /**
   * The base URL of the server where the agent's requests are processed.
   */
  serverUrl = "http://localhost:7998";

  /**
   * The database adapter used for interacting with the database.
   */
  databaseAdapter: DatabaseAdapter;

  /**
   * Authentication token used for securing requests.
   */
  token: string | null;

  /**
   * Indicates if debug messages should be logged.
   */
  debugMode: boolean;

  /**
   * Custom actions that the agent can perform.
   */
  actions: Action[] = [];

  /**
   * Evaluators used to assess and guide the agent's responses.
   */
  evaluators: Evaluator[] = [];

  /**
   * Context providers used to provide context for message generation.
   */
  providers: Provider[] = [];

  /**
   * The model to use for completion.
   */
  model = "gpt-3.5-turbo-0125";

  /**
   * The model to use for embedding.
   */
  embeddingModel = "text-embedding-3-small";

  /**
   * Fetch function to use
   * Some environments may not have access to the global fetch function and need a custom fetch override.
   */
  fetch = fetch;

  /**
   * Store messages that are sent and received by the agent.
   */
  messageManager: MemoryManager = new MemoryManager({
    runtime: this,
    tableName: "messages",
  });

  /**
   * Store and recall descriptions of users based on conversations.
   */
  descriptionManager: MemoryManager = new MemoryManager({
    runtime: this,
    tableName: "descriptions",
  });

  /**
   * Manage the fact and recall of facts.
   */
  factManager: MemoryManager = new MemoryManager({
    runtime: this,
    tableName: "facts",
  });

  /**
   * Manage the creation and recall of static information (documents, historical game lore, etc)
   */
  loreManager: MemoryManager = new MemoryManager({
    runtime: this,
    tableName: "lore",
  });

  /**
   * Creates an instance of AgentRuntime.
   * @param opts - The options for configuring the AgentRuntime.
   * @param opts.conversationLength - The number of messages to hold in the recent message cache.
   * @param opts.token - The JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker.
   * @param opts.debugMode - If true, debug messages will be logged.
   * @param opts.serverUrl - The URL of the worker.
   * @param opts.actions - Optional custom actions.
   * @param opts.evaluators - Optional custom evaluators.
   * @param opts.providers - Optional context providers.
   * @param opts.model - The model to use for completion.
   * @param opts.embeddingModel - The model to use for embedding.
   * @param opts.agentId - Optional ID of the agent.
   * @param opts.databaseAdapter - The database adapter used for interacting with the database.
   * @param opts.fetch - Custom fetch function to use for making requests.
   */

  constructor(opts: {
    conversationLength?: number; // number of messages to hold in the recent message cache
    agentId?: UUID; // ID of the agent
    token: string; // JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker
    debugMode?: boolean; // If true, will log debug messages
    serverUrl?: string; // The URL of the worker
    actions?: Action[]; // Optional custom actions
    evaluators?: Evaluator[]; // Optional custom evaluators
    providers?: Provider[];
    model?: string; // The model to use for completion
    embeddingModel?: string; // The model to use for embedding
    databaseAdapter: DatabaseAdapter; // The database adapter used for interacting with the database
    fetch?: typeof fetch | unknown;
  }) {
    this.#conversationLength =
      opts.conversationLength ?? this.#conversationLength;
    this.debugMode = opts.debugMode ?? false;
    this.databaseAdapter = opts.databaseAdapter;
    this.agentId = opts.agentId ?? zeroUuid;
    this.fetch = (opts.fetch as typeof fetch) ?? this.fetch;

    if (!opts.databaseAdapter) {
      throw new Error("No database adapter provided");
    }

    this.serverUrl = opts.serverUrl ?? this.serverUrl;
    this.model = opts.model ?? this.model;
    this.embeddingModel = opts.embeddingModel ?? this.embeddingModel;
    if (!this.serverUrl) {
      console.warn("No serverUrl provided, defaulting to localhost");
    }

    this.token = opts.token;

    (opts.actions ?? []).forEach((action) => {
      this.registerAction(action);
    });

    (opts.evaluators ?? defaultEvaluators).forEach((evaluator) => {
      this.registerEvaluator(evaluator);
    });
    (opts.providers ?? defaultProviders).forEach((provider) => {
      this.registerContextProvider(provider);
    });
  }

  /**
   * Get the number of messages that are kept in the conversation buffer.
   * @returns The number of recent messages to be kept in memory.
   */
  getConversationLength() {
    return this.#conversationLength;
  }

  /**
   * Register an action for the agent to perform.
   * @param action The action to register.
   */
  registerAction(action: Action) {
    this.actions.push(action);
  }

  /**
   * Register an evaluator to assess and guide the agent's responses.
   * @param evaluator The evaluator to register.
   */
  registerEvaluator(evaluator: Evaluator) {
    this.evaluators.push(evaluator);
  }

  /**
   * Register a context provider to provide context for message generation.
   * @param provider The context provider to register.
   */
  registerContextProvider(provider: Provider) {
    this.providers.push(provider);
  }

  /**
   * Send a message to the OpenAI API for completion.
   * @param opts - The options for the completion request.
   * @param opts.context The context of the message to be completed.
   * @param opts.stop A list of strings to stop the completion at.
   * @param opts.model The model to use for completion.
   * @param opts.frequency_penalty The frequency penalty to apply to the completion.
   * @param opts.presence_penalty The presence penalty to apply to the completion.
   * @param opts.temperature The temperature to apply to the completion.
   * @returns The completed message.
   */
  async completion({
    context = "",
    stop = [],
    model = this.model,
    frequency_penalty = 0.0,
    presence_penalty = 0.0,
    temperature = 0.7,
  }) {
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        stop,
        model,
        frequency_penalty,
        presence_penalty,
        temperature,
        messages: [
          {
            role: "user",
            content: context,
          },
        ],
      }),
    };

    try {
      const response = await fetch(
        `${this.serverUrl}/chat/completions`,
        requestOptions,
      );

      if (!response.ok) {
        throw new Error(
          "OpenAI API Error: " + response.status + " " + response.statusText,
        );
      }

      const body = await response.json();

      interface OpenAIResponse {
        choices: Array<{ message: { content: string } }>;
      }

      const content = (body as OpenAIResponse).choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }
      return content;
    } catch (error) {
      console.error("ERROR:", error);
      throw new Error(error as string);
    }
  }

  /**
   * Send a message to the OpenAI API for embedding.
   * @param input The input to be embedded.
   * @returns The embedding of the input.
   */
  async embed(input: string) {
    const embeddingModel = this.embeddingModel;

    // Check if we already have the embedding in the lore
    const cachedEmbedding = await this.retrieveCachedEmbedding(input);
    if (cachedEmbedding) {
      return cachedEmbedding;
    }

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        input,
        model: embeddingModel,
        length: 1536,
      }),
    };
    try {
      const response = await fetch(
        `${this.serverUrl}/embeddings`,
        requestOptions,
      );

      if (!response.ok) {
        throw new Error(
          "OpenAI API Error: " + response.status + " " + response.statusText,
        );
      }

      interface OpenAIEmbeddingResponse {
        data: Array<{ embedding: number[] }>;
      }

      const data: OpenAIEmbeddingResponse = await response.json();

      return data?.data?.[0].embedding;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async retrieveCachedEmbedding(input: string) {
    const similaritySearchResult =
      await this.messageManager.getCachedEmbeddings(input);
    if (similaritySearchResult.length > 0) {
      return similaritySearchResult[0].embedding;
    }
    return null;
  }

  /**
   * Process the actions of a message.
   * @param message The message to process.
   * @param content The content of the message to process actions from.
   */
  async processActions(message: Message, content: Content, state?: State) {
    if (!content.action) {
      return;
    }

    const action = this.actions.find(
      (a: { name: string }) => a.name === content.action,
    )!;

    if (!action) {
      return console.warn("No action found for", content.action);
    }

    if (!action.handler) {
      if (this.debugMode) {
        logger.log(
          `No handler found for action ${action.name}, skipping`,
          "",
          "yellow",
        );
      }
      return;
    }

    return await action.handler(this, message, state);
  }

  /**
   * Evaluate the message and state using the registered evaluators.
   * @param message The message to evaluate.
   * @param state The state of the agent.
   * @returns The results of the evaluation.
   */
  async evaluate(message: Message, state?: State) {
    const evaluatorPromises = this.evaluators.map(
      async (evaluator: Evaluator) => {
        if (!evaluator.handler) {
          return null;
        }

        const result = await evaluator.validate(this, message, state);
        if (result) {
          return evaluator;
        }
        return null;
      },
    );

    const resolvedEvaluators = await Promise.all(evaluatorPromises);
    const evaluatorsData = resolvedEvaluators.filter(Boolean);

    // if there are no evaluators this frame, return
    if (evaluatorsData.length === 0) {
      return [];
    }

    const evaluators = formatEvaluators(evaluatorsData as Evaluator[]);
    const evaluatorNames = formatEvaluatorNames(evaluatorsData as Evaluator[]);
    const evaluatorConditions = formatEvaluatorConditions(
      evaluatorsData as Evaluator[],
    );

    const context = composeContext({
      state: {
        ...state,
        evaluators,
        evaluatorNames,
        evaluatorConditions,
      } as State,
      template: evaluationTemplate,
    });

    const result = await this.completion({
      context,
    });

    const parsedResult = parseJsonArrayFromText(result) as unknown as string[];

    this.evaluators
      .filter((evaluator: Evaluator) => parsedResult?.includes(evaluator.name))
      .forEach((evaluator: Evaluator) => {
        if (!evaluator?.handler) return;

        evaluator.handler(this, message);
      });

    return parsedResult;
  }

  /**
   * Ensure the existence of a participant in the room. If the participant does not exist, they are added to the room.
   * @param user_id - The user ID to ensure the existence of.
   * @throws An error if the participant cannot be added.
   */
  async ensureParticipantExists(user_id: UUID, room_id: UUID) {
    const participants =
      await this.databaseAdapter.getParticipantsForAccount(user_id);

    if (participants?.length === 0) {
      await this.databaseAdapter.addParticipant(user_id, room_id);
    }
  }

  /**
   * Ensure the existence of a room between the agent and a user. If no room exists, a new room is created and the user
   * and agent are added as participants. The room ID is returned.
   * @param user_id - The user ID to create a room with.
   * @returns The room ID of the room between the agent and the user.
   * @throws An error if the room cannot be created.
   */
  async ensureRoomExists(user_id: UUID, room_id?: UUID) {
    if (room_id) {
      // check if room exists
      const created = await this.databaseAdapter.createRoom(room_id);
      if (created) {
        this.databaseAdapter.addParticipant(user_id, room_id);
        this.databaseAdapter.addParticipant(this.agentId, room_id);
      }
      return room_id;
    }
    const rooms = await this.databaseAdapter.getRoomsForParticipants([
      user_id,
      this.agentId,
    ]);

    if (rooms.length === 0) {
      const room_id = await this.databaseAdapter.createRoom();
      this.databaseAdapter.addParticipant(user_id, room_id);
      this.databaseAdapter.addParticipant(this.agentId, room_id);
      return room_id;
    }
    // else return the first room
    else {
      return rooms[0];
    }
  }

  /**
   * Compose the state of the agent into an object that can be passed or used for response generation.
   * @param message The message to compose the state from.
   * @returns The state of the agent.
   */
  async composeState(
    message: Message,
    additionalKeys: { [key: string]: unknown } = {},
  ) {
    const { user_id, room_id } = message;

    const conversationLength = this.getConversationLength();
    const recentFactsCount = Math.ceil(this.getConversationLength() / 2);
    const relevantFactsCount = Math.ceil(this.getConversationLength() / 2);

    const [
      actorsData,
      recentMessagesData,
      recentFactsData,
      goalsData,
      loreData,
    ]: [Actor[], Memory[], Memory[], Goal[], Memory[]] = await Promise.all([
      getActorDetails({ runtime: this, room_id }),
      this.messageManager.getMemories({
        room_id,
        count: conversationLength,
        unique: false,
      }),
      this.factManager.getMemories({
        room_id,
        count: recentFactsCount,
      }),
      getGoals({
        runtime: this,
        count: 10,
        onlyInProgress: false,
        room_id,
      }),
      getLore({
        runtime: this,
        message: (message.content as Content).content,
        count: 5,
        match_threshold: 0.5,
      }),
    ]);

    const goals = formatGoalsAsString({ goals: goalsData });

    let relevantFactsData: Memory[] = [];

    if (recentFactsData.length > recentFactsCount) {
      relevantFactsData = (
        await this.factManager.searchMemoriesByEmbedding(
          recentFactsData[0].embedding!,
          {
            room_id,
            count: relevantFactsCount,
          },
        )
      ).filter((fact: Memory) => {
        return !recentFactsData.find(
          (recentFact: Memory) => recentFact.id === fact.id,
        );
      });
    }

    const actors = formatActors({ actors: actorsData ?? [] });

    const recentMessages = formatMessages({
      actors: actorsData ?? [],
      messages: recentMessagesData.map((memory: Memory) => {
        const newMemory = { ...memory };
        delete newMemory.embedding;
        return newMemory;
      }),
    });

    const recentFacts = formatFacts(recentFactsData);
    const relevantFacts = formatFacts(relevantFactsData);

    const lore = formatLore(loreData);

    const senderName = actorsData?.find(
      (actor: Actor) => actor.id === user_id,
    )?.name;
    const agentName = actorsData?.find(
      (actor: Actor) => actor.id === this.agentId,
    )?.name;

    const initialState = {
      agentId: this.agentId,
      agentName,
      senderName,
      actors: addHeader("# Actors", actors),
      actorsData,
      room_id,
      goals: addHeader(
        "### Goals\n{{agentName}} should prioritize accomplishing the objectives that are in progress.",
        goals,
      ),
      lore: addHeader("### Important Information", lore),
      loreData,
      goalsData,
      recentMessages: addHeader("### Conversation Messages", recentMessages),
      recentMessagesData,
      recentFacts: addHeader("### Recent Facts", recentFacts),
      recentFactsData,
      relevantFacts: addHeader("# Relevant Facts", relevantFacts),
      relevantFactsData,
      ...additionalKeys,
    };

    const actionPromises = this.actions.map(async (action: Action) => {
      const result = await action.validate(this, message, initialState);
      if (result) {
        return action;
      }
      return null;
    });

    const evaluatorPromises = this.evaluators.map(async (evaluator) => {
      const result = await evaluator.validate(this, message, initialState);
      if (result) {
        return evaluator;
      }
      return null;
    });

    const [resolvedEvaluators, resolvedActions, providers] = await Promise.all([
      Promise.all(evaluatorPromises),
      Promise.all(actionPromises),
      getProviders(this, message, initialState),
    ]);

    const evaluatorsData = resolvedEvaluators.filter(Boolean) as Evaluator[];
    const evaluators = formatEvaluators(evaluatorsData);
    const evaluatorNames = formatEvaluatorNames(evaluatorsData);
    const evaluatorConditions = formatEvaluatorConditions(evaluatorsData);
    const evaluatorExamples = formatEvaluatorExamples(evaluatorsData);

    const actionsData = resolvedActions.filter(Boolean) as Action[];

    const formattedActionExamples =
      `json\`\`\`\n` + composeActionExamples(actionsData, 10) + `\n\`\`\``;

    const actionState = {
      actionNames: addHeader(
        "### Available actions to respond with:",
        formatActionNames(actionsData),
      ),
      actionConditions: formatActionConditions(actionsData),
      actions: formatActions(actionsData),
      actionExamples: addHeader("### Action Examples", formattedActionExamples),
      evaluatorsData,
      evaluators,
      evaluatorNames,
      evaluatorConditions,
      evaluatorExamples,
      providers,
    };

    return { ...initialState, ...actionState };
  }
}
