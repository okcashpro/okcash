import { IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { Account, RpcProvider } from "starknet";

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

export class WalletProvider {
    private account: Account;
    private provider: RpcProvider;

    constructor(runtime: IAgentRuntime) {
        this.account = getStarknetAccount(runtime);
        this.provider = getStarknetProvider(runtime);
    }

    async getFormattedTokenBalances(): Promise<string> {
        return "";
    }

    async getPortfolioValue(): Promise<string> {
        return "";
    }
}
