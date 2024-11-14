import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import { getStarknetAccount, getStarknetProvider } from "./wallet";

export const getStarknetAccountProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        return getStarknetAccount(runtime);
    },
};

export const getStarknetRpcProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        return getStarknetProvider(runtime);
    },
};
