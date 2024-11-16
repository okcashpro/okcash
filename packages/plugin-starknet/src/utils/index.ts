import { IAgentRuntime } from "@ai16z/eliza";

export const validateSettings = (runtime: IAgentRuntime) => {
    const requiredSettings = [
        "STARKNET_ADDRESS",
        "STARKNET_PRIVATE_KEY",
        "STARKNET_RPC_URL",
    ];

    for (const setting of requiredSettings) {
        if (!runtime.getSetting(setting)) {
            return false;
        }
    }

    return true;
};
