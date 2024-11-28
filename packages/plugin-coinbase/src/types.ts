import { Coinbase } from "@coinbase/coinbase-sdk";
import { z } from "zod";

export const ChargeSchema = z.object({
    id: z.string().nullable(),
    price: z.number(),
    type: z.string(),
    currency: z.string().min(3).max(3),
    name: z.string().min(1),
    description: z.string().min(1),
});

export interface ChargeContent {
    id: string | null;
    price: number;
    type: string;
    currency: string; // Currency code (e.g., USD)
    name: string; // Name of the charge
    description: string; // Description of the charge
}

export const isChargeContent = (object: any): object is ChargeContent => {
    if (ChargeSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};

export const TransferSchema = z.object({
    network: z.string().toLowerCase(),
    receivingAddresses: z.array(z.string()),
    transferAmount: z.number(),
    assetId: z.string().toLowerCase(),
});

export interface TransferContent {
    network: string;
    receivingAddresses: string[];
    transferAmount: number;
    assetId: string;
}

export const isTransferContent = (object: any): object is TransferContent => {
    return TransferSchema.safeParse(object).success;
};

export type Transaction = {
    address: string;
    amount: number;
    status: string;
    errorCode: string | null;
    transactionUrl: string | null;
};
const assetValues = Object.values(Coinbase.assets) as [string, ...string[]];
export const TradeSchema = z.object({
    network: z.string().toLowerCase(),
    amount: z.number(),
    sourceAsset: z.enum(assetValues),
    targetAsset: z.enum(assetValues),
    leverage: z.number().optional(), // Optional leverage for leveraged trades
});

export interface TradeContent {
    network: string;
    amount: number;
    sourceAsset: string;
    targetAsset: string;
}

export const isTradeContent = (object: any): object is TradeContent => {
    return TradeSchema.safeParse(object).success;
};

export type TradeTransaction = {
    network: string;
    amount: number;
    sourceAsset: string;
    targetAsset: string;
    status: string;
    errorCode: string | null;
    transactionUrl: string | null;
};
