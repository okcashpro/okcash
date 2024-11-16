import { createRuntime } from "../test_resources/createRuntime.ts";
import { TokenProvider, WalletProvider, Connection, PublicKey } from "@ai16z/plugin-solana";

import { describe, test, expect, beforeEach, vi } from 'vitest';

describe("TokenProvider Tests", () => {
    let tokenProvider: TokenProvider;

    // Mock the dependencies
    vi.mock("cross-fetch");
    vi.mock("fs");
    vi.mock("node-cache");
    vi.mock("@solana/web3.js");
    vi.mock("unique-names-generator");

    beforeEach(() => {
        tokenProvider = new TokenProvider(
            "2weMjPLLybRMMva1fM3U31goWWrCpF59CHWNhnCJ9Vyh",
            new WalletProvider(
                new Connection("https://api.mainnet-beta.solana.com"),
                new PublicKey("2weMjPLLybRMMva1fM3U31goWWrCpF59CHWNhnCJ9Vyh")
            )
        );
    });

    test("should fetch token security data", async () => {
        const { runtime } = await createRuntime({
            conversationLength: 10,
        });

        // Mock the response for the fetchTokenSecurity call
        const mockFetchResponse = {
            success: true,
            data: {
                ownerBalance: "100",
                creatorBalance: "50",
                ownerPercentage: 10,
                creatorPercentage: 5,
                top10HolderBalance: "200",
                top10HolderPercent: 20,
            },
        };

        // Mock fetchWithRetry function
        const fetchSpy = vi
            .spyOn(tokenProvider as any, "fetchWithRetry")
            .mockResolvedValue(mockFetchResponse);

        //  Run the fetchTokenSecurity method
        //  const securityData = await tokenProvider.fetchTokenSecurity();

        // Check if the data returned is correct
        //  expect(securityData).toEqual({
        //    ownerBalance: "100",
        //    creatorBalance: "50",
        //    ownerPercentage: 10,
        //    creatorPercentage: 5,
        //    top10HolderBalance: "200",
        //    top10HolderPercent: 20,
        //  });
        //console.log the securityData
        //  console.log({ securityData });

        //  const holderList = await tokenProvider.fetchHolderList();

        //  console.log({ holderList });

        //  const tradeData = await tokenProvider.fetchTokenTradeData();
        //  console.log({ tradeData });

        //  const dexScreenerData = await tokenProvider.fetchDexScreenerData();
        //  console.log({ dexScreenerData });

        // const tokenReport =
        //     await tokenProvider.getFormattedTokenReport(runtime);
        // console.log({ tokenReport });

        // Ensure the mock was called
        expect(fetchSpy).toHaveBeenCalled();
    });
});
