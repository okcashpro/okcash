export interface DeriveKeyResponse {
    key: string;
    certificate_chain: string[];
    asUint8Array: (max_length?: number) => Uint8Array;
}

export type Hex = `0x${string}`;

export interface TdxQuoteResponse {
    quote: Hex;
    event_log: string;
}
