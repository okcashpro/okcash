import { Plugin } from "@ai16z/eliza";
import { executeSwap } from "./actions/swap";

export const PROVIDER_CONFIG = {
    AVNU_API: "https://starknet.impulse.avnu.fi/v1",
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    DEFAULT_RPC: "https://api.mainnet-beta.solana.com",
    TOKEN_ADDRESSES: {
        SOL: "",
        BTC: "",
        ETH: "",
        STRK: "",
    },
    TOKEN_SECURITY_ENDPOINT: "/defi/token_security?address=",
    TOKEN_TRADE_DATA_ENDPOINT: "/defi/v3/token/trade-data/single?address=",
    DEX_SCREENER_API: "https://api.dexscreener.com/latest/dex/tokens/",
    MAIN_WALLET: "",
};

export const starknetPlugin: Plugin = {
    name: "starknet",
    description: "Starknet Plugin for Eliza",
    actions: [executeSwap],
    evaluators: [],
    providers: [],
};

export default starknetPlugin;
