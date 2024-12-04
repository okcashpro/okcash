export interface TransactionResponse {
    signer: {
        address: string;
        keyIndex: number;
    };
    txid: string;
}
