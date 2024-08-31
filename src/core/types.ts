import { type AgentRuntime } from "./runtime.ts";

/**
 * Represents a UUID, which is a universally unique identifier conforming to the UUID standard.
 */
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Represents the content of a message, including its main text (`content`), any associated action (`action`), and the source of the content (`source`), if applicable.
 */
export interface Content {
  content: string; // The main text content of the message.
  action?: string; // An optional action associated with the message, indicating a specific behavior or response required.
  source?: string; // The source of the content, if applicable, such as a reference or origin.
  attachments?: Media[];
  [key: string]: unknown; // Allows for additional properties to be included dynamically.
}

/**
 * Represents an example of content, typically used for demonstrating or testing purposes. Includes user, content, optional action, and optional source.
 */
export interface ActionExample {
  user: string; // The user associated with the message.
  content: Content; // The content of the message.
}

/**
 * Represents an example of content, typically used for demonstrating or testing purposes. Includes user, content, optional action, and optional source.
 */
export interface ConversationExample {
  user_id: UUID; // The user associated with the message.
  content: Content; // The content of the message.
}

/**
 * Represents an actor in the conversation, which could be a user or the agent itself, including their name, details (such as tagline, summary, and quote), and a unique identifier.
 */
export interface Actor {
  name: string; // The name of the actor.
  details: { tagline: string; summary: string; quote: string }; // Additional details about the actor, including a tagline, a summary, and a favorite quote.
  id: UUID; // A unique identifier for the actor.
}

/**
 * Represents a memory record, which could be a message or any other piece of information remembered by the system, including its content, associated user IDs, and optionally, its embedding vector for similarity comparisons.
 */
export interface Memory {
  id?: UUID; // An optional unique identifier for the memory.
  user_id: UUID; // The user ID associated with the memory.
  created_at?: string; // An optional timestamp indicating when the memory was created.
  content: Content; // The content of the memory, which can be a structured object or a plain string.
  embedding?: number[]; // An optional embedding vector representing the semantic content of the memory.
  room_id: UUID; // The room or conversation ID associated with the memory.
}

/**
 * Represents an objective within a goal, detailing what needs to be achieved and whether it has been completed.
 */
export interface Objective {
  id?: string; // A unique identifier for the objective.
  description: string; // A description of what the objective entails.
  completed: boolean; // A boolean indicating whether the objective has been completed.
}

export enum GoalStatus {
  DONE = "DONE",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_PROGRESS",
}

/**
 * Represents a goal, which is a higher-level aim composed of one or more objectives. Goals are tracked to measure progress or achievements within the conversation or system.
 */
export interface Goal {
  id?: UUID; // A unique identifier for the goal.
  room_id: UUID; // A list of user IDs associated with the goal, for goals relevant to specific users or groups.
  user_id: UUID; // The user ID of the goal's owner or the user who is primarily responsible for the goal.
  name: string; // The name or title of the goal.
  status: GoalStatus; // The current status of the goal, such as "in progress" or "completed".
  objectives: Objective[]; // A list of objectives that make up the goal.
}

/**
 * Represents the state of the conversation or context in which the agent is operating, including information about users, messages, goals, and other relevant data.
 */
export interface State {
  user_id?: UUID; // An optional ID of the user who sent the current message.
  agentId?: UUID; // An optional ID of the agent within the current conversation or context.
  bio: string; // A string representation of the agent's bio.
  lore: string; // A list of lore bits for the agent.
  messageDirections: string; // A string representation of directions for messages in the current state.
  postDirections: string; // A string representation of directions for posting in the current state.
  room_id: UUID; // The ID of the current room or conversation context.
  agentName?: string; // An optional name of the agent, used for referencing the agent in conversations.
  senderName?: string; // An optional name of the sender of the current message.
  actors: string; // A string representation of the actors involved in the conversation, including their details.
  actorsData?: Actor[]; // An optional array of actor objects involved in the conversation.
  goals?: string; // An optional string representation of the goals relevant to the current conversation or context.
  goalsData?: Goal[]; // An optional array of goal objects relevant to the current conversation or context.
  recentMessages: string; // A string representation of recent messages in the conversation, for context.
  recentMessagesData: Memory[]; // An array of memory objects representing recent messages in the conversation.
  recentFacts?: string; // An optional string representation of recent facts derived from the conversation.
  recentFactsData?: Memory[]; // An optional array of memory objects representing recent facts.
  relevantFacts?: string; // An optional string representation of facts relevant to the current context or topic.
  relevantFactsData?: Memory[]; // An optional array of memory objects representing relevant facts.
  actionNames?: string; // An optional string listing the names of actions that are valid in the current state.
  actions?: string; // An optional string representation of actions and their descriptions, relevant to the current state.
  actionsData?: Action[]; // An optional array of action objects relevant to the current state.
  actionExamples?: string; // An optional string representation of examples of actions, for demonstration or testing.
  providers?: string; // An optional string representation of available providers and their descriptions, relevant to the current state.
  responseData?: Content; // An optional content object representing the agent's response in the current state.
  [key: string]: unknown; // Allows for additional properties to be included dynamically.
}

/**
 * Represents a message within the conversation, including its content and associated metadata such as the sender, agent, and room IDs.
 */
export interface Message {
  user_id: UUID; // The ID of the user who sent the message.
  content: Content; // The content of the message, which can be a structured object or a plain string.
  room_id: UUID; // The ID of the room or conversation context in which the message was sent.
}

/**
 * Represents an example of a message, typically used for demonstrating or testing purposes, including optional content and action.
 */
export interface MessageExample {
  user: string; // The user associated with the message example.
  content: Content; // The content of the message example, which may be null for actions that don't produce visible content.
}

/**
 * Represents the type of a handler function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to any type.
 */
export type Handler = (
  runtime: AgentRuntime,
  message: Message,
  state?: State,
  options?: { [key: string]: unknown }, // additional options can be used for things like tests or state-passing on a chain
  callback?: (response: Content) => void,
) => Promise<unknown>;

/**
 * Represents the type of a validator function, which takes a runtime instance, a message, and an optional state, and returns a promise resolving to a boolean indicating whether the validation passed.
 */
export type Validator = (
  runtime: AgentRuntime,
  message: Message,
  state?: State,
) => Promise<boolean>;

/**
 * Represents an action that the agent can perform, including conditions for its use, a description, examples, a handler function, and a validation function.
 */
export interface Action {
  condition: string; // A description of the conditions under which the action is appropriate.
  description: string; // A detailed description of what the action entails.
  examples: ActionExample[][]; // An array of arrays of content examples demonstrating the action.
  handler: Handler; // The function that handles the action.
  name: string; // The name of the action.
  validate: Validator; // The function that validates whether the action is appropriate in the current context.
}

/**
 * Represents an example for evaluation, including the context, an array of message examples, and the expected outcome.
 */
export interface EvaluationExample {
  context: string; // The context in which the evaluation example is set.
  messages: Array<ActionExample>; // An array of message examples relevant to the evaluation.
  outcome: string; // The expected outcome of the evaluation, typically in a structured format such as JSON.
}

/**
 * Represents an evaluator, which is used to assess and guide the agent's responses based on the current context and state.
 */
export interface Evaluator {
  condition: string; // A description of the conditions under which the evaluator is applicable.
  description: string; // A detailed description of what the evaluator assesses or guides.
  examples: EvaluationExample[]; // An array of evaluation examples demonstrating the evaluator.
  handler: Handler; // The function that handles the evaluation.
  name: string; // The name of the evaluator.
  validate: Validator; // The function that validates whether the evaluator is applicable in the current context.
}

/**
 * Represents a provider, which is used to retrieve information or perform actions on behalf of the agent, such as fetching data from an external API or service.
 */
export interface Provider {
  get: (runtime: AgentRuntime, message: Message, state?: State) => Promise<any>;
}

/**
 * Represents a relationship between two users, including their IDs, the status of the relationship, and the room ID in which the relationship is established.
 */
export interface Relationship {
  id: UUID;
  user_a: UUID;
  user_b: UUID;
  user_id: UUID;
  room_id: UUID;
  status: string;
  created_at?: string;
}

/**
 * Represents a user, including their name, details, and a unique identifier.
 */
export interface Account {
  id: UUID;
  name: string;
  details?: { [key: string]: any };
  email?: string;
  avatar_url?: string;
}

/**
 * Represents a participant in a room, including their ID and account details.
 */
export interface Participant {
  id: UUID;
  account: Account;
}

/**
 * Represents a room or conversation context, including its ID and a list of participants.
 */
export interface Room {
  id: UUID;
  participants: Participant[];
}

export type Media = {
  id: string;
  url: string;
  title: string;
  source: string;
  description: string;
  text: string;
};

export type Character = {
  name: string;
  bio: string;
  lore: string[];
  messageExamples: MessageExample[][];
  postExamples: string[];
  people: string[];
  topics: string[];
  adjectives: string[];
  style: {
    all: string[];
    chat: string[];
    post: string[];
  };
};
