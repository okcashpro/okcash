import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { WalletProvider } from "../providers/wallet.ts";
import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    PrivateKeyVariants,
} from "@aptos-labs/ts-sdk";
import { defaultCharacter } from "@ai16z/eliza";
import BigNumber from "bignumber.js";
import { APT_DECIMALS } from "../constants.ts";

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

        const aptosClient = new Aptos(
            new AptosConfig({
                network: Network.TESTNET,
            })
        );
        const aptosAccount = Account.fromPrivateKey({
            privateKey: new Ed25519PrivateKey(
                PrivateKey.formatPrivateKey(
                    // this is a testnet private key
                    "0x90e02bf2439492bd9be1ec5f569704accefd65ba88a89c4dcef1977e0203211e",
                    PrivateKeyVariants.Ed25519
                )
            ),
        });

        // Create new instance of TokenProvider with mocked dependencies
        walletProvider = new WalletProvider(
            aptosClient,
            aptosAccount.accountAddress.toStringLong(),
            mockCacheManager
        );

        mockedRuntime = {
            character: defaultCharacter,
        };
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    describe("Wallet Integration", () => {
        it("should check wallet address", async () => {
            const result =
                await walletProvider.getFormattedPortfolio(mockedRuntime);

            const prices = await walletProvider.fetchPrices();
            const aptAmountOnChain =
                await walletProvider.aptosClient.getAccountAPTAmount({
                    accountAddress: walletProvider.address,
                });
            const aptAmount = new BigNumber(aptAmountOnChain)
                .div(new BigNumber(10).pow(APT_DECIMALS))
                .toFixed(4);
            const totalUsd = new BigNumber(aptAmount)
                .times(prices.apt.usd)
                .toFixed(2);

            expect(result).toEqual(
                `Eliza\nWallet Address: ${walletProvider.address}\n` +
                    `Total Value: $${totalUsd} (${aptAmount} APT)\n`
            );
        });
    });
});
