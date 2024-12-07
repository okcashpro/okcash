import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { defaultCharacter } from "@ai16z/eliza";
import { getFlowConnectorInstance } from "../providers/connector.provider";
import { FlowWalletProvider } from "../providers/wallet.provider";

// Mock NodeCache
vi.mock("node-cache", () => ({
    default: vi.fn().mockImplementation(() => ({
        set: vi.fn(),
        get: vi.fn().mockReturnValue(null),
    })),
}));

// Mock path module
vi.mock("path", async () => {
    const actual = await vi.importActual("path");
    return {
        ...actual,
        join: vi.fn().mockImplementation((...args) => args.join("/")),
    };
});

// Mock the ICacheManager
const mockCacheManager = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn(),
    delete: vi.fn(),
};

describe("WalletProvider", () => {
    let walletProvider: FlowWalletProvider;
    let mockedRuntime;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockCacheManager.get.mockResolvedValue(null);

        mockedRuntime = {
            character: defaultCharacter,
            getSetting: vi.fn().mockImplementation((key: string) => {
                if (key === "FLOW_NETWORK") return "testnet";
                if (key === "FLOW_ENDPOINT_URL") return undefined;
                if (key === "FLOW_ADDRESS") return "0xad5a851aeb126bca";
                // This is the private key for the testnet address above
                if (key === "FLOW_PRIVATE_KEY")
                    return "0x09e3d2e8f479a63e011ec776b39f89ce0ba8ca115f450a7e2d1909e5f113f831";
                return undefined;
            }),
        };

        // Create new instance of TokenProvider with mocked dependencies
        const connector = await getFlowConnectorInstance(mockedRuntime);
        walletProvider = new FlowWalletProvider(
            mockedRuntime,
            connector,
            mockCacheManager as any
        );
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Wallet Integration", () => {
        it("should check wallet info", async () => {
            const result = await walletProvider.queryAccountBalanceInfo();
            const balance = await walletProvider.getWalletBalance();

            expect(walletProvider.address).toEqual(result.address);
            expect(balance).toEqual(result.balance);
        });
    });
});
