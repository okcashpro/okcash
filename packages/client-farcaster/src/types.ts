import { CastAddBody, CastAddMessage } from "@farcaster/hub-nodejs";
import type { Hex } from "viem";

export type Profile = {
    fid: number;
    signer: Hex;
    name: string;
    username: string;
    pfp?: string;
    bio?: string;
    url?: string;
    // location?: string;
    // twitter?: string;
    // github?: string;
};

export type Cast = {
    profile: Profile;
} & CastAddMessage;
