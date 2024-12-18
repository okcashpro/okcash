import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { WalletProvider } from "../providers/wallet.ts";
import { defaultCharacter } from "@ai16z/eliza";

// Mock NodeCache
vi.mock("node-cache", () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            set: vi.fn(),
            get: vi.fn().mockReturnValue(null),
        })),
    };
});

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
    let walletProvider;
    let mockedRuntime;

    beforeEach(() => {
        vi.clearAllMocks();
        mockCacheManager.get.mockResolvedValue(null);

        mockedRuntime = {
            character: defaultCharacter,
            getSetting: vi.fn().mockImplementation((key: string) => {
                // this is a testnet private key
                if (key === "STORY_PRIVATE_KEY")
                    return "0x1ad065323caa081ab78d6f4fd2b52181e09cf29a4e60bd7519997b2d03fa44f3";
                return undefined;
            }),
        };

        // Create new instance of WalletProvider with mocked dependencies
        walletProvider = new WalletProvider(mockedRuntime);
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Wallet Integration", () => {
        it("should check wallet address", async () => {
            const address = await walletProvider.getAddress();
            expect(address).toEqual(walletProvider.address);
        });
    });
});
