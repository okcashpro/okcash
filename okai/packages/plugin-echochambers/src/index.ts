import { okaiLogger, Client, IAgentRuntime, Plugin } from "@okcashpro/okai";
import { EchoChamberClient } from "./echoChamberClient";
import { InteractionClient } from "./interactions";
import { EchoChamberConfig } from "./types";
import { validateEchoChamberConfig } from "./environment";

export const EchoChamberClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        try {
            // Validate configuration before starting
            await validateEchoChamberConfig(runtime);

            const apiUrl = runtime.getSetting("ECHOCHAMBERS_API_URL");
            const apiKey = runtime.getSetting("ECHOCHAMBERS_API_KEY");

            if (!apiKey || !apiUrl) {
                throw new Error(
                    "ECHOCHAMBERS_API_KEY/ECHOCHAMBERS_API_URL is required"
                );
            }

            const config: EchoChamberConfig = {
                apiUrl,
                apiKey,
                username:
                    runtime.getSetting("ECHOCHAMBERS_USERNAME") ||
                    `agent-${runtime.agentId}`,
                model: runtime.modelProvider,
                defaultRoom:
                    runtime.getSetting("ECHOCHAMBERS_DEFAULT_ROOM") ||
                    "general",
            };

            okaiLogger.log("Starting EchoChambers client...");

            // Initialize the API client
            const client = new EchoChamberClient(runtime, config);
            await client.start();

            // Initialize the interaction handler
            const interactionClient = new InteractionClient(client, runtime);
            await interactionClient.start();

            okaiLogger.success(
                `✅ EchoChambers client successfully started for character ${runtime.character.name}`
            );

            return { client, interactionClient };
        } catch (error) {
            okaiLogger.error("Failed to start EchoChambers client:", error);
            throw error;
        }
    },

    async stop(runtime: IAgentRuntime) {
        try {
            okaiLogger.warn("Stopping EchoChambers client...");

            // Get client instances if they exist
            const clients = (runtime as any).clients?.filter(
                (c: any) =>
                    c instanceof EchoChamberClient ||
                    c instanceof InteractionClient
            );

            for (const client of clients) {
                await client.stop();
            }

            okaiLogger.success("EchoChambers client stopped successfully");
        } catch (error) {
            okaiLogger.error("Error stopping EchoChambers client:", error);
            throw error;
        }
    },
};

export const echoChamberPlugin: Plugin = {
    name: "echochambers",
    description:
        "Plugin for interacting with EchoChambers API to enable multi-agent communication",
    actions: [], // No custom actions needed - core functionality handled by client
    evaluators: [], // No custom evaluators needed
    providers: [], // No custom providers needed
    clients: [EchoChamberClientInterface],
};

export default echoChamberPlugin;

// Export types and classes
export * from "./types";
export { EchoChamberClient } from "./echoChamberClient";
export { InteractionClient } from "./interactions";
