import time from "./providers/time.ts";
import { AgentRuntime } from "./runtime.ts";
import { State, type Message, type Provider } from "./types.ts";

export const defaultProviders: Provider[] = [time];

/**
 * Formats provider outputs into a string which can be injected into the context.
 * @param runtime The AgentRuntime object.
 * @param message The incoming message object.
 * @param state The current state object.
 * @returns A string that concatenates the outputs of each provider.
 */
export async function getProviders(
  runtime: AgentRuntime,
  message: Message,
  state?: State,
) {
  const providerResults = await Promise.all(
    runtime.providers.map(async (provider) => {
      return await provider.get(runtime, message, state);
    }),
  );

  return providerResults.join("\n");
}
