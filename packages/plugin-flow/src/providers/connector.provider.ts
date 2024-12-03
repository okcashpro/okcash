import { IAgentRuntime, Memory, Provider, State } from "@ai16z/eliza";

import FlowConnector, { NetworkType } from "./utils/flow.connector";

// Here is the configuration file for fixes.
import flowJSON from "../../flow.json" assert { type: "json" };

// Singleton instance for the Flow connector
let _instance: FlowConnector;

/**
 * Get the singleton instance of the Flow connector
 * @param runtime The runtime object
 */
async function _getDefaultConnectorInstance(
    runtime: IAgentRuntime
): Promise<FlowConnector> {
    if (!_instance) {
        _instance = await _createFlowConnector(runtime, flowJSON);
    }
    return _instance;
}

/**
 * Create a new instance of the Flow connector
 * @param runtime
 * @param flowJSON
 */
async function _createFlowConnector(
    runtime: IAgentRuntime,
    flowJSON: object
): Promise<FlowConnector> {
    const rpcEndpoint = runtime.getSetting("FLOW_ENDPOINT_URL");
    const network = runtime.getSetting("FLOW_NETWORK") as NetworkType;
    const instance = new FlowConnector(flowJSON, network, rpcEndpoint);
    await instance.onModuleInit();
    return instance;
}

/**
 * Get the singleton instance of the Flow connector
 * @param runtime
 */
export async function getFlowConnectorInstance(
    runtime: IAgentRuntime
): Promise<FlowConnector> {
    let connector: FlowConnector;
    const flowJsonStr = runtime.getSetting("FLOW_JSON");
    if (!flowJsonStr) {
        connector = await _getDefaultConnectorInstance(runtime);
    } else {
        try {
            connector = await _createFlowConnector(
                runtime,
                JSON.parse(flowJsonStr)
            );
        } catch {
            connector = await _getDefaultConnectorInstance(runtime);
        }
    }
    return connector;
}

/**
 * Flow connector provider for AI agents
 */
export class FlowConnectorProvider {
    constructor(private readonly instance: FlowConnector) {}

    getConnectorStatus(runtime: IAgentRuntime): string {
        let output = `<Agent>${runtime.character.name}[${runtime.character.id ?? 0}]\n`;
        output += `Flow connected network: ${this.instance.network}\n`;
        output += `Flow connected Endpoint: ${this.instance.rpcEndpoint}\n`;
        return output;
    }

    // async getFormattedPortfolio(_runtime: IAgentRuntime): Promise<string> {
    //     return Promise.resolve(this.getConnectorStatus(_runtime));
    // }
}

const flowConnectorProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> => {
        try {
            const provider = new FlowConnectorProvider(
                await getFlowConnectorInstance(runtime)
            );
            return provider.getConnectorStatus(runtime);
        } catch (error) {
            console.error("Error in Flow connector provider:", error);
            return null;
        }
    },
};

// Module exports
export { flowConnectorProvider, FlowConnector };
