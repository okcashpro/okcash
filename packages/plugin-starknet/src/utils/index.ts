import { IAgentRuntime } from "@ai16z/eliza";

import { Account, Contract, RpcProvider } from "starknet";

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

export const getTokenBalance = async (
    runtime: IAgentRuntime,
    tokenAddress: string
) => {
    const provider = getStarknetProvider(runtime);

    const { abi: tokenAbi } = await provider.getClassAt(tokenAddress);
    if (tokenAbi === undefined) {
        throw new Error("no abi.");
    }

    const tokenContract = new Contract(tokenAbi, tokenAddress, provider);

    tokenContract.connect(getStarknetAccount(runtime));

    return await tokenContract.balanceOf(tokenAddress);
};

export const getStarknetProvider = (runtime: IAgentRuntime) => {
    return new RpcProvider({
        nodeUrl: runtime.getSetting("STARKNET_RPC_URL"),
    });
};

export const getStarknetAccount = (runtime: IAgentRuntime) => {
    return new Account(
        getStarknetProvider(runtime),
        runtime.getSetting("STARKNET_ADDRESS"),
        runtime.getSetting("STARKNET_PRIVATE_KEY")
    );
};
