import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAvnuQuote } from "./avnu";

describe("fetchAvnuQuote", () => {
    const mockRuntime = {
        getSetting: vi.fn().mockReturnValue("test-api-key"),
    };

    const mockQuoteResponse = {
        quoteId: "test-quote-id",
        sellTokenAddress: "0x123",
        sellAmount: "1000000000000000000",
        sellAmountInUsd: 100,
        buyTokenAddress: "0x456",
        buyAmount: "2000000000000000000",
        buyAmountInUsd: 200,
        buyAmountWithoutFees: "1950000000000000000",
        buyAmountWithoutFeesInUsd: 195,
        estimatedAmount: true,
        chainId: "1",
        blockNumber: "123456",
        expiry: 1234567890,
        routes: [],
        gasFees: "1000000",
        gasFeesInUsd: 1,
        avnuFees: "500000",
        avnuFeesInUsd: 0.5,
        avnuFeesBps: "10",
        integratorFees: "0",
        integratorFeesInUsd: 0,
        integratorFeesBps: "0",
        priceRatioUsd: 2,
        liquiditySource: "test-source",
        sellTokenPriceInUsd: 100,
        buyTokenPriceInUsd: 200,
        gasless: {
            active: false,
            gasTokenPrices: [],
        },
    };

    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
        // Reset fetch mock
        global.fetch = vi.fn();
    });

    it("should successfully fetch a quote", async () => {
        // Mock the fetch response
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockQuoteResponse),
        });

        const params = {
            sellTokenAddress: "0x123",
            buyTokenAddress: "0x456",
            sellAmount: "1000000000000000000",
        };

        const result = await fetchAvnuQuote(params);

        // Verify the fetch was called with correct parameters
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining(
                "https://starknet.api.avnu.fi/swap/v2/quotes"
            ),
            expect.objectContaining({
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: "Bearer test-api-key",
                },
            })
        );

        // Verify the URL contains the correct query parameters
        const fetchCall = (fetch as unknown as { mock: { calls: string[][] } })
            .mock.calls[0][0];
        expect(fetchCall).toContain(
            `sellTokenAddress=${params.sellTokenAddress}`
        );
        expect(fetchCall).toContain(
            `buyTokenAddress=${params.buyTokenAddress}`
        );
        expect(fetchCall).toContain(`sellAmount=${params.sellAmount}`);

        // Verify the response
        expect(result).toEqual(mockQuoteResponse);
    });

    it("should handle API errors", async () => {
        // Mock a failed response
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: false,
            text: () => Promise.resolve("API Error"),
        });

        const params = {
            sellTokenAddress: "0x123",
            buyTokenAddress: "0x456",
        };

        await expect(fetchAvnuQuote(params)).rejects.toThrow(
            "Failed to fetch Avnu quote: API Error"
        );
    });

    it("should include optional parameters when provided", async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockQuoteResponse),
        });

        const params = {
            sellTokenAddress: "0x123",
            buyTokenAddress: "0x456",
            takerAddress: "0x789",
            excludeSources: ["source1", "source2"],
            size: 5,
            integratorName: "test-integrator",
        };

        await fetchAvnuQuote(params);

        const fetchCall = (fetch as unknown as { mock: { calls: string[][] } })
            .mock.calls[0][0];
        expect(fetchCall).toContain(`takerAddress=${params.takerAddress}`);
        expect(fetchCall).toContain(
            `excludeSources=${encodeURIComponent(params.excludeSources.join(","))}`
        );
        expect(fetchCall).toContain(`size=${params.size}`);
        expect(fetchCall).toContain(`integratorName=${params.integratorName}`);
    });
});
