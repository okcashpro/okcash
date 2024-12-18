import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    okaiLogger
} from "@okcashpro/okai";

export const sampleProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
        // Data retrieval logic for the provider
        okaiLogger.log("Retrieving data in sampleProvider...");
    },
};
