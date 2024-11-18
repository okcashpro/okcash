import { IAgentRuntime } from "@ai16z/eliza";
import {
    CastId,
    FidRequest,
    getInsecureHubRpcClient,
    getSSLHubRpcClient,
    HubRpcClient,
    isCastAddMessage,
    isUserDataAddMessage,
    Message,
    MessagesResponse,
    ViemLocalEip712Signer,
    gateway
    Signer,
} from "@farcaster/hub-nodejs";
import { Cast, Profile } from "./types";
import { toHex } from "viem";
import {
    generatePrivateKey,
    privateKeyToAccount,
    toAccount,
} from "viem/accounts";

export class FarcasterClient {
    runtime: IAgentRuntime;
    farcaster: HubRpcClient;

    cache = new Map<string, string>();

    constructor(opts: { runtime: IAgentRuntime; url: string; ssl: boolean }) {
        this.runtime = opts.runtime;
        this.farcaster = opts.ssl
            ? getSSLHubRpcClient(opts.url)
            : getInsecureHubRpcClient(opts.url);
    }

    async register() {
        const account = privateKeyToAccount(generatePrivateKey());
        const eip712Signer = new ViemLocalEip712Signer(account);

        const signature = await eip712Signer.signRegister({
            to: account.address,
            recovery: "0x00000000FcB080a4D6c39a9354dA9EB9bC104cd7",
            nonce,
            deadline,
        });
    }

    async submitMessage(cast: Message, retryTimes?: number): Promise<void> {
        const result = await this.farcaster.submitMessage(cast);

        if (result.isErr()) {
            throw result.error;
        }
    }

    async getCast(castId: CastId): Promise<Message> {
        const cast = await this.farcaster.getCast(castId);
        if (cast.isErr()) {
            throw cast.error;
        }
        return cast.value;
    }

    async getCastByFid(request: FidRequest): Promise<MessagesResponse> {
        const cast = await this.farcaster.getCastsByFid(request);
        if (cast.isErr()) {
            throw cast.error;
        }
        return cast.value;
    }

    async getMentions(request: FidRequest): Promise<MessagesResponse> {
        const cast = await this.farcaster.getCastsByMention(request);
        if (cast.isErr()) {
            throw cast.error;
        }
        return cast.value;
    }

    async getProfile(fid: number) {
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

        return profile;
    }

    async getTimeline(request: FidRequest & { profile?: Profile }) {
        const timeline: Cast[] = [];

        const profile = request.profile ?? (await this.getProfile(request.fid));
        const results = await this.getCastByFid(request);

        for (const message of results.messages) {
            if (isCastAddMessage(message)) {
                timeline.push({
                    profile,
                    ...message,
                });
            }
        }

        return {
            profile,
            timeline,
            nextPageToken: results.nextPageToken,
        };
    }
}
