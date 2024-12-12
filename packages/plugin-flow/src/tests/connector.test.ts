import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
    getFlowConnectorInstance,
    FlowConnectorProvider,
} from "../providers/connector.provider";
import { defaultCharacter } from "@ai16z/eliza";

describe("ConnectorProvider", () => {
    let connectorProvider: FlowConnectorProvider;
    let mockedRuntime;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockedRuntime = {
            character: defaultCharacter,
            getSetting: vi.fn().mockImplementation((key: string) => {
                if (key === "FLOW_NETWORK") return "testnet";
                if (key === "FLOW_ENDPOINT_URL") return undefined;
                return undefined;
            }),
        };

        const connector = await getFlowConnectorInstance(mockedRuntime);
        connectorProvider = new FlowConnectorProvider(connector);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Connector", () => {
        it("should check environment", () => {
            const result = connectorProvider.getConnectorStatus(mockedRuntime);

            expect(result).toEqual(
                `Eliza[0] Connected to\n` +
                    `Flow network: testnet\n` +
                    "Flow Endpoint: https://testnet.onflow.org\n"
            );
        });
    });
});
