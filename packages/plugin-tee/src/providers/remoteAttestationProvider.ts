import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";
import {TappdClient} from '@phala/dstack-sdk'

const remoteAttestationProvider: Provider = {
    get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        // TODO: Generate Remote Attestations on Memories and States?
        const endpoint = runtime.getSetting("DSTACK_SIMULATOR_ENDPOINT");
        const client = (endpoint) ? new TappdClient(endpoint) : new TappdClient();
        try {
            try {
                const tdxQuote = await client.tdxQuote('test');
                return `Your Agent's remote attestation is: ${JSON.stringify(tdxQuote)}`;
            } catch (error) {
                console.error("Error creating remote attestation:", error);
                return "";
            }
        } catch (error) {
            console.error("Error in remote attestation provider:", error.message);
            return `Failed to fetch TDX Quote information: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
};

export { remoteAttestationProvider };
