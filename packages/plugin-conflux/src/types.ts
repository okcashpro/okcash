import { z } from "zod";
import { Content } from "@ai16z/eliza";

export const TransferSchema = z.object({
    to: z.string(),
    amount: z.number(), // use number ignoring decimals issue
});

export interface TransferContent extends Content {
    to: string;
    amount: number;
}

export const isTransferContent = (object: any): object is TransferContent => {
    if (TransferSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid content: ", object);
    return false;
};