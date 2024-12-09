import type { IAgentRuntime, Memory, State } from "@ai16z/eliza";
import {
    ChainId,
    createConfig,
    executeRoute,
    ExtendedChain,
    getRoutes,
} from "@lifi/sdk";
import { getChainConfigs, WalletProvider } from "../providers/wallet";
import { registerIPTemplate } from "../templates";
import { RegisterIPParams, Transaction } from "../types";
import { Hash } from "viem";

export { registerIPTemplate };

export class RegisterIPAction {
    private config;

    constructor(private walletProvider: WalletProvider) {
        this.config = createConfig({
            integrator: "eliza",
            chains: Object.values(
                getChainConfigs(this.walletProvider.runtime)
            ).map((config) => ({
                id: config.chainId,
                name: config.name,
                key: config.name.toLowerCase(),
                chainType: "EVM",
                nativeToken: {
                    ...config.nativeCurrency,
                    chainId: config.chainId,
                    address: "0x0000000000000000000000000000000000000000",
                    coinKey: config.nativeCurrency.symbol,
                },
                metamask: {
                    chainId: `0x${config.chainId.toString(16)}`,
                    chainName: config.name,
                    nativeCurrency: config.nativeCurrency,
                    rpcUrls: [config.rpcUrl],
                    blockExplorerUrls: [config.blockExplorerUrl],
                },
                diamondAddress: "0x0000000000000000000000000000000000000000",
                coin: config.nativeCurrency.symbol,
                mainnet: true,
            })) as ExtendedChain[],
        });
    }

    async registerIP(params: RegisterIPParams): Promise<{ txHash: Hash }> {
        const walletClient = this.walletProvider.getWalletClient();
        const [fromAddress] = await walletClient.getAddresses();

        // TODO: Implement IP registration
        return {
            // TODO: replace with actual txn response
            txHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        };
    }
}

export const registerIPAction = {
    name: "registerIP",
    description: "Register an IP address on the Odyssey chain",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any
    ) => {
        const walletProvider = new WalletProvider(runtime);
        const action = new RegisterIPAction(walletProvider);
        return action.registerIP(options);
    },
    template: registerIPTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Bridge 1 ETH from Ethereum to Base",
                    action: "CROSS_CHAIN_TRANSFER",
                },
            },
        ],
    ],
    similes: ["CROSS_CHAIN_TRANSFER", "CHAIN_BRIDGE", "MOVE_CROSS_CHAIN"],
}; // TODO: add more examples / similies
