import { IAgentRuntime } from "@ai16z/eliza";
import {
    CastAddMessage,
    CastId,
    FidRequest,
    getInsecureHubRpcClient,
    getSSLHubRpcClient,
    HubRpcClient,
    isCastAddMessage,
    isUserDataAddMessage,
    Message,
    MessagesResponse,
} from "@farcaster/hub-nodejs";
import { Cast, Profile } from "./types";
import { toHex } from "viem";
import { populateMentions } from "./utils";

export class FarcasterClient {
    runtime: IAgentRuntime;
    farcaster: HubRpcClient;

    cache: Map<string, any>;

    constructor(opts: {
        runtime: IAgentRuntime;
        url: string;
        ssl: boolean;
        cache: Map<string, any>;
    }) {
        this.cache = opts.cache;
        this.runtime = opts.runtime;
        this.farcaster = opts.ssl
            ? getSSLHubRpcClient(opts.url)
            : getInsecureHubRpcClient(opts.url);
    }

    async submitMessage(cast: Message, retryTimes?: number): Promise<void> {
        const result = await this.farcaster.submitMessage(cast);

        if (result.isErr()) {
            throw result.error;
        }
    }

    async loadCastFromMessage(message: CastAddMessage): Promise<Cast> {
        const profileMap = {};

        const profile = await this.getProfile(message.data.fid);

        profileMap[message.data.fid] = profile;

        for (const mentionId of message.data.castAddBody.mentions) {
            if (profileMap[mentionId]) continue;
            profileMap[mentionId] = await this.getProfile(mentionId);
        }

        const text = populateMentions(
            message.data.castAddBody.text,
            message.data.castAddBody.mentions,
            message.data.castAddBody.mentionsPositions,
            profileMap
        );

        return {
            id: toHex(message.hash),
            message,
            text,
            profile,
        };
    }

    async getCast(castId: CastId): Promise<Message> {
        const castHash = toHex(castId.hash);

        if (this.cache.has(`farcaster/cast/${castHash}`)) {
            return this.cache.get(`farcaster/cast/${castHash}`);
        }

        const cast = await this.farcaster.getCast(castId);

        if (cast.isErr()) {
            throw cast.error;
        }

        this.cache.set(`farcaster/cast/${castHash}`, cast);

        return cast.value;
    }

    async getCastsByFid(request: FidRequest): Promise<MessagesResponse> {
        const cast = await this.farcaster.getCastsByFid(request);
        if (cast.isErr()) {
            throw cast.error;
        }

        cast.value.messages.map((cast) => {
            this.cache.set(`farcaster/cast/${toHex(cast.hash)}`, cast);
        });

        return cast.value;
    }

    async getMentions(request: FidRequest): Promise<MessagesResponse> {
        const cast = await this.farcaster.getCastsByMention(request);
        if (cast.isErr()) {
            throw cast.error;
        }

        cast.value.messages.map((cast) => {
            this.cache.set(`farcaster/cast/${toHex(cast.hash)}`, cast);
        });

        return cast.value;
    }

    async getProfile(fid: number): Promise<Profile> {
        if (this.cache.has(`farcaster/profile/${fid}`)) {
            return this.cache.get(`farcaster/profile/${fid}`) as Profile;
        }

        const result = await this.farcaster.getUserDataByFid({
            fid: fid,
            reverse: true,
        });

        if (result.isErr()) {
            throw result.error;
        }

        const profile: Profile = {
            fid,
            name: "",
            signer: "0x",
            username: "",
        };

        const userDataBodyType = {
            1: "pfp",
            2: "name",
            3: "bio",
            5: "url",
            6: "username",
            // 7: "location",
            // 8: "twitter",
            // 9: "github",
        } as const;

        for (const message of result.value.messages) {
            if (isUserDataAddMessage(message)) {
                if (message.data.userDataBody.type in userDataBodyType) {
                    const prop =
                        userDataBodyType[message.data.userDataBody.type];
                    profile[prop] = message.data.userDataBody.value;
                }
            }
        }

        const [lastMessage] = result.value.messages;

        if (lastMessage) {
            profile.signer = toHex(lastMessage.signer);
        }

        this.cache.set(`farcaster/profile/${fid}`, profile);

        return profile;
    }

    async getTimeline(request: FidRequest): Promise<{
        timeline: Cast[];
        nextPageToken?: Uint8Array | undefined;
    }> {
        const timeline: Cast[] = [];

        const results = await this.getCastsByFid(request);

        for (const message of results.messages) {
            if (isCastAddMessage(message)) {
                this.cache.set(
                    `farcaster/cast/${toHex(message.hash)}`,
                    message
                );

                timeline.push(await this.loadCastFromMessage(message));
            }
        }

        return {
            timeline,
            nextPageToken: results.nextPageToken,
        };
    }
}
