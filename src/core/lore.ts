import { UUID } from "crypto";
import { zeroUuid } from "./constants.ts";
import { type AgentRuntime } from "./runtime.ts";
import { Content, Memory } from "./types.ts";

/**
 * Adds a piece of lore to the lore database. Lore can include static information like documents, historical facts, game lore, etc.
 *
 * @param {Object} params - The parameters for adding lore.
 * @param {AgentRuntime} params.runtime - The runtime environment of the agent.
 * @param {string} params.source - The source of the lore content.
 * @param {string} params.content - The actual content of the lore.
 * @param {string} [params.embedContent] - Optional content used to generate an embedding if different from `content`.
 * @param {UUID} [params.user_id=zeroUuid] - The user ID associated with the lore, defaults to a zero UUID.
 * @param {UUID} [params.room_id=zeroUuid] - The room ID associated with the lore, defaults to a zero UUID.
 * @returns {Promise<void>} A promise that resolves when the lore has been added successfully.
 */
export async function addLore({
  runtime,
  source,
  content,
  embedContent,
  user_id = zeroUuid,
  room_id = zeroUuid,
}: {
  runtime: AgentRuntime;
  source: string;
  content: Content;
  embedContent?: Content;
  user_id?: UUID;
  room_id?: UUID;
}) {
  const loreManager = runtime.loreManager;

  const embedding = embedContent
    ? await runtime.embed(embedContent.content)
    : await runtime.embed(content.content);

  try {
    await loreManager.createMemory({
      user_id,
      content: { content: content.content, source },
      room_id,
      embedding,
    });
  } catch (e) {
    console.error("Error adding lore", e);
    throw e;
  }
}

/**
 * Retrieves lore from the lore database based on a search query. This function uses embedding to find similar lore entries.
 *
 * @param {Object} params - The parameters for retrieving lore.
 * @param {AgentRuntime} params.runtime - The runtime environment of the agent.
 * @param {string} params.message - The search query message to find relevant lore.
 * @param {number} [params.match_threshold] - The similarity threshold for matching lore entries, lower values mean more strict matching.
 * @param {number} [params.count] - The maximum number of lore entries to retrieve.
 * @returns {Promise<Memory[]>} A promise that resolves to an array of lore entries that match the search query.
 */
export async function getLore({
  runtime,
  message,
  match_threshold,
  room_id = zeroUuid,
  count,
}: {
  runtime: AgentRuntime;
  message: string;
  match_threshold?: number;
  room_id?: UUID;
  count?: number;
}) {
  const loreManager = runtime.loreManager;
  const embedding = await runtime.embed(message);
  const lore = await loreManager.searchMemoriesByEmbedding(embedding, {
    room_id,
    match_threshold,
    count,
  });
  return lore;
}

/**
 * Formats an array of lore entries into a single string. Each entry is separated by a newline, and sources are annotated.
 *
 * @param {Memory[]} lore - An array of lore entries to format.
 * @returns {string} A formatted string containing all the lore entries, each separated by a newline, with sources annotated.
 */
export const formatLore = (lore: Memory[]) => {
  const messageStrings = lore.reverse().map((fragment: Memory) => {
    const content = fragment.content as Content;
    return `${content.content}\n${content.source ? " (Source: " + content.source + ")" : ""}`;
  });
  const finalMessageStrings = messageStrings.join("\n");
  return finalMessageStrings;
};
