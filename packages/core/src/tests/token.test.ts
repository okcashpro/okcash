// // Now import other modules
// import { createRuntime } from "../test_resources/createRuntime";
// import { TokenProvider, WalletProvider } from "@ai16z/plugin-solana";
// import { Connection, PublicKey } from "@solana/web3.js";
// import { describe, test, expect, beforeEach, vi } from "vitest";
// import NodeCache from "node-cache";

// describe("TokenProvider Tests", async () => {
//     let tokenProvider: TokenProvider;

//     beforeEach(async () => {
//         // Clear all mocks before each test
//         vi.clearAllMocks();

//         const { runtime } = await createRuntime({
//             env: process.env,
//             conversationLength: 10,
//         });

//         const walletProvider = new WalletProvider(
//             new Connection(runtime.getSetting("RPC_URL")),
//             new PublicKey(runtime.getSetting("WALLET_PUBLIC_KEY"))
//         );
//         // Create new instance of TokenProvider
//         tokenProvider = new TokenProvider(
//             "2weMjPLLybRMMva1fM3U31goWWrCpF59CHWNhnCJ9Vyh",
//             walletProvider
//         );

//         // Clear the cache and ensure it's empty
//         (tokenProvider as any).cache.flushAll();
//         (tokenProvider as any).cache.close();
//         (tokenProvider as any).cache = new NodeCache();

//         // Mock the getCachedData method instead
//         vi.spyOn(tokenProvider as any, "getCachedData").mockReturnValue(null);
//     });

//     test("should fetch token security data", async () => {
//         // Mock the response for the fetchTokenSecurity call
//         const mockFetchResponse = {
//             success: true,
//             data: {
//                 ownerBalance: "100",
//                 creatorBalance: "50",
//                 ownerPercentage: 10,
//                 creatorPercentage: 5,
//                 top10HolderBalance: "200",
//                 top10HolderPercent: 20,
//             },
//         };

//         // Mock fetchWithRetry function
//         const fetchSpy = vi
//             .spyOn(tokenProvider as any, "fetchWithRetry")
//             .mockResolvedValue(mockFetchResponse);

//         // Run the fetchTokenSecurity method
//         const securityData = await tokenProvider.fetchTokenSecurity();
//         // Check if the data returned is correct
//         expect(securityData).toEqual({
//             ownerBalance: "100",
//             creatorBalance: "50",
//             ownerPercentage: 10,
//             creatorPercentage: 5,
//             top10HolderBalance: "200",
//             top10HolderPercent: 20,
//         });

//         // Ensure the mock was called with correct URL
//         expect(fetchSpy).toHaveBeenCalledWith(
//             expect.stringContaining(
//                 "https://public-api.birdeye.so/defi/token_security?address=2weMjPLLybRMMva1fM3U31goWWrCpF59CHWNhnCJ9Vyh"
//             )
//         );
//     });
// });
