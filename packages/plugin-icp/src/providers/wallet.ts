// src/providers/wallet.ts
import { Actor, ActorSubclass, HttpAgent } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza/src/types";

export class WalletProvider {
    private privateKey: string;
    private identity: Ed25519KeyIdentity;
    private agent: HttpAgent;
    private host: string;

    constructor(privateKey: string, host: string = "https://ic0.app") {
        this.privateKey = privateKey;
        this.host = host;
        this.identity = this.createIdentity();
        this.agent = this.createAgent();
    }

    private createIdentity(): Ed25519KeyIdentity {
        if (!this.privateKey) {
            throw new Error("Private key is required");
        }

        try {
            return Ed25519KeyIdentity.fromSecretKey(
                Buffer.from(this.privateKey, "hex")
            );
        } catch (error) {
            console.error("Error creating identity:", error);
            throw new Error("Failed to create ICP identity");
        }
    }

    private createAgent(): HttpAgent {
        return HttpAgent.createSync({
            identity: this.identity,
            host: this.host,
        });
    }

    getIdentity(): Ed25519KeyIdentity {
        return this.identity;
    }

    getAgent(): HttpAgent {
        return this.agent;
    }

    getPrincipal(): Principal {
        return this.identity.getPrincipal();
    }

    // Create an Actor with identity
    async createActor<T>(
        idlFactory: IDL.InterfaceFactory,
        canisterId: string,
        fetchRootKey = false
    ): Promise<ActorSubclass<T>> {
        if (fetchRootKey) {
            await this.agent.fetchRootKey();
        }

        return Actor.createActor<T>(idlFactory, {
            agent: this.agent,
            canisterId,
        });
    }
}

// Add the new provider instance
export const icpWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ): Promise<any> {
        try {
            const privateKey = runtime.getSetting(
                "INTERNET_COMPUTER_PRIVATE_KEY"
            );
            if (!privateKey) {
                throw new Error("INTERNET_COMPUTER_PRIVATE_KEY not found");
            }

            const wallet = new WalletProvider(privateKey);

            return {
                wallet,
                identity: wallet.getIdentity(),
                agent: wallet.getAgent(),
                principal: wallet.getPrincipal().toString(),
                isAuthenticated: true,
            };
        } catch (error) {
            console.error("Error in wallet provider:", error);
            return {
                wallet: null,
                identity: null,
                agent: null,
                principal: null,
                isAuthenticated: false,
                error: error.message,
            };
        }
    },
};

// Export utility function
export const createAnonymousActor = async <T>(
    idlFactory: IDL.InterfaceFactory,
    canisterId: string,
    host: string = "https://ic0.app",
    fetchRootKey = false
): Promise<ActorSubclass<T>> => {
    const anonymousAgent = new HttpAgent({
        host,
        retryTimes: 1,
        verifyQuerySignatures: false,
    });

    if (fetchRootKey) {
        await anonymousAgent.fetchRootKey();
    }

    return Actor.createActor<T>(idlFactory, {
        agent: anonymousAgent,
        canisterId,
    });
};
