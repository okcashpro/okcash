import {
    Client,
    composeContext,
    Content,
    elizaLogger,
    generateMessageResponse,
    generateShouldRespond,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    shouldRespondFooter,
    State,
    stringToUuid,
    UUID,
} from "@ai16z/eliza";
import {
    CastAddMessage,
    CastType,
    Signer,
    FarcasterNetwork,
    CastId,
    FidRequest,
    getInsecureHubRpcClient,
    getSSLHubRpcClient,
    HubAsyncResult,
    HubRpcClient,
    Message,
    MessagesResponse,
    makeCastAdd,
    isUserDataAddData,
    isCastAddMessage,
} from "@farcaster/hub-nodejs";
import { EventEmitter } from "events";
import { Address, Hex, toHex } from "viem";
import { embeddingZeroVector } from "@ai16z/eliza";
import { splitCastContent } from "./utils";
import { privateKeyToAccount } from "viem/accounts";

function messageId({
    messageHash,
    agentId,
}: {
    messageHash: Hex;
    agentId: string;
}) {
    return `${messageHash}-${agentId}`;
}

type Profile = {
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

export async function buildConversationThread({
    cast,
    runtime,
    client,
}: {
    cast: Message;
    runtime: IAgentRuntime;
    client: FarcasterClient;
}): Promise<void> {
    const thread: Message[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentCast: Message) {
        if (!currentCast) {
            elizaLogger.log("No current cast found");
            return;
        }

        const messageHash = toHex(currentCast.hash);

        if (visited.has(messageHash)) {
            return;
        }

        const roomId = stringToUuid(
            messageId({
                messageHash,
                agentId: runtime.agentId,
            })
        );
        // Check if the current tweet has already been saved
        const memory =
            await client.runtime.messageManager.getMemoryById(roomId);

        if (!memory) {
            elizaLogger.log("Creating memory for cast", messageHash);

            const profile = await client.getProfile(currentCast.data.fid);

            const userId = stringToUuid(toHex(currentCast.signer));

            await client.runtime.ensureConnection(
                userId,
                roomId,
                profile.username,
                profile.name,
                "farcaster"
            );

            await client.runtime.messageManager.createMemory({
                id: roomId,
                agentId: client.runtime.agentId,
                userId: userId,
                content: {
                    text: currentCast.data.castAddBody.text,
                    source: "farcaster",
                    url: "",
                    inReplyTo: undefined,
                },
                createdAt: currentCast.data.timestamp * 1000,
                roomId,
                embedding: embeddingZeroVector,
            });
        }

        visited.add(messageHash);

        thread.unshift(currentCast);

        // if (currentTweet.inReplyToStatus) {
        //     await processThread(currentTweet.inReplyToStatus);
        // }
    }

    await processThread(cast);
}

export async function sendTweet({
    fid,
    client,
    runtime,
    content,
    roomId,
    inReplyTo,
    signer,
    network,
}: {
    fid: number;
    client: FarcasterClient;
    runtime: IAgentRuntime;
    content: Content;
    roomId: UUID;
    inReplyTo?: CastId;
    signer: Signer;
    network: FarcasterNetwork;
}): Promise<Memory[]> {
    const chunks = splitCastContent(content.text);
    const sent: Message[] = [];
    let parentCastId = inReplyTo;

    for (const chunk of chunks) {
        const castAddMessageResult = await makeCastAdd(
            {
                text: chunk,
                embeds: [],
                embedsDeprecated: [],
                mentions: [],
                mentionsPositions: [],
                type: CastType.CAST, // TODO: check CastType.LONG_CAST
                parentCastId,
            },
            {
                fid,
                network,
            },
            signer
        );

        if (castAddMessageResult.isErr()) {
            continue;
        }

        const castAddMessage = castAddMessageResult.value;

        const messageResult =
            await client.farcaster.submitMessage(castAddMessage);

        if (messageResult.isErr()) {
            continue;
        }

        const message = messageResult.value;

        // // Parse the response
        // const tweetResult = body.data.create_tweet.tweet_results.result;

        // const finalTweet: Tweet = {
        //     id: tweetResult.rest_id,
        //     text: tweetResult.legacy.full_text,
        //     conversationId: tweetResult.legacy.conversation_id_str,
        //     //createdAt:
        //     timestamp: tweetResult.timestamp * 1000,
        //     userId: tweetResult.legacy.user_id_str,
        //     inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
        //     permanentUrl: `https://twitter.com/${twitterUsername}/status/${tweetResult.rest_id}`,
        //     hashtags: [],
        //     mentions: [],
        //     photos: [],
        //     thread: [],
        //     urls: [],
        //     videos: [],
        // };

        sent.push(message);
        parentCastId = {
            fid,
            hash: message.hash,
        };

        // Wait a bit between tweets to avoid rate limiting issues
        // await wait(1000, 2000);
    }

    const memories: Memory[] = sent.map((message) => ({
        id: stringToUuid(
            messageId({
                messageHash: toHex(message.hash),
                agentId: runtime.agentId,
            })
        ),
        agentId: client.runtime.agentId,
        userId: client.runtime.agentId,
        content: {
            text: message.data.castAddBody.text,
            source: "farcaster",
            url: "",
            inReplyTo: undefined,
        },
        roomId,
        embedding: embeddingZeroVector,
        createdAt: message.data.timestamp * 1000,
    }));

    return memories;
}

export class FarcasterClient extends EventEmitter {
    runtime: IAgentRuntime;
    farcaster: HubRpcClient;

    cache = new Map<string, string>();

    constructor(opts: { url: string; ssl: boolean }) {
        super();

        this.farcaster = opts.ssl
            ? getSSLHubRpcClient(opts.url)
            : getInsecureHubRpcClient(opts.url);
    }

    async submitMessage(message: HubAsyncResult<Message>) {}

    async getCast(castId: CastId): Promise<Message> {
        const cast = await this.farcaster.getCast(castId);
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

        const profile: Partial<Profile> = {
            fid,
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
            if (isUserDataAddData(message.data)) {
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
}

export const farcasterShouldRespondTemplate = `` + shouldRespondFooter;
export const farcasterMessageHandlerTemplate = ``;

class FarcasterInteractionManager {
    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime
    ) {}

    public async start() {
        const handleTwitterInteractionsLoop = () => {
            this.handleInteractions();
            setTimeout(
                handleTwitterInteractionsLoop,
                (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000
            ); // Random interval between 2-5 minutes
        };
        handleTwitterInteractionsLoop();
    }

    private async handleInteractions() {
        const agentFid = Number(this.runtime.getSetting("FARCASTER_FID"));

        const { messages } = await this.client.getMentions({
            fid: agentFid,
        });

        for (const mention of messages) {
            if (!isCastAddMessage(mention)) continue;

            const messageHash = toHex(mention.hash);
            const messageSigner = toHex(mention.signer);
            const conversationId = `${messageHash}-${this.runtime.agentId}`;
            const roomId = stringToUuid(conversationId);
            const userId = stringToUuid(messageSigner);

            const profile = await this.client.getProfile(mention.data.fid);

            await this.runtime.ensureConnection(
                userId,
                roomId,
                profile.username,
                profile.name,
                "farcaster"
            );

            await buildConversationThread({
                client: this.client,
                cast: mention,
                runtime: this.runtime,
            });

            const message = {
                content: { text: mention.data.castAddBody.text },
                agentId: this.runtime.agentId,
                userId,
                roomId,
            };

            await this.handleCast({
                agentFid,
                cast: mention,
                message,
            });
        }
    }

    private async handleCast({
        agentFid,
        cast,
        message,
    }: {
        agentFid: number;
        cast: CastAddMessage;
        message: Memory;
    }) {
        const messageHash = toHex(cast.hash);
        if (cast.data.fid === agentFid) {
            console.log("skipping cast from bot itself", messageHash);
            return;
        }
        if (!message.content.text) {
            console.log("skipping cast with no text", messageHash);
            return { text: "", action: "IGNORE" };
        }

        const formatCast = (
            cast: CastAddMessage,
            profile: Partial<Profile>
        ) => {
            return `  ID: ${toHex(cast.hash)}
          From: ${profile.name} (@${profile.username})
          Text: ${cast.data.castAddBody.text}`;
        };

        const profile = await this.client.getProfile(cast.data.fid);
        const currentPost = formatCast(cast, profile);

        let homeTimeline = [];

        // const formattedHomeTimeline =
        //     `# ${this.runtime.character.name}'s Home Timeline\n\n` +
        //     homeTimeline
        //         .map((tweet) => {
        //             return `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}\nText: ${tweet.text}\n---\n`;
        //         })
        //         .join("\n");

        let state = await this.runtime.composeState(message, {
            // timeline,
            // twitterClient: this.twitterClient,
            // twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
            // currentPost,
            // timeline: formattedHomeTimeline,
        });

        const shouldRespondContext = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.farcasterShouldRespondTemplate ||
                this.runtime.character?.templates?.shouldRespondTemplate ||
                farcasterShouldRespondTemplate,
        });

        const memoryId = stringToUuid(
            messageId({
                agentId: this.runtime.agentId,
                messageHash,
            })
        );

        const memory =
            await this.runtime.messageManager.getMemoryById(memoryId);

        if (!memory) {
            //createMemory
        }

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.SMALL,
        });

        if (!shouldRespond) {
            console.log("Not responding to message");
            return { text: "", action: "IGNORE" };
        }

        const context = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.farcasterMessageHandlerTemplate ||
                this.runtime.character?.templates?.messageHandlerTemplate ||
                farcasterMessageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        response.inReplyTo = memoryId;
        if (response.text) {
            try {
                const callback: HandlerCallback = async (response: Content) => {
                    const memories = await sendTweet({
                        fid: agentFid,
                        client: this.client,
                        content: response,
                        network: FarcasterNetwork.MAINNET,
                        roomId: message.roomId,
                        runtime: this.runtime,
                        signer: {} as any as Signer,
                        inReplyTo: {
                            fid: cast.data.fid,
                            hash: cast.hash,
                        },
                    });

                    return memories;
                };

                const responseMessages = await callback(response);

                state = await this.runtime.updateRecentMessageState(state);

                for (const responseMessage of responseMessages) {
                    await this.runtime.messageManager.createMemory(
                        responseMessage
                    );
                }
                await this.runtime.evaluate(message, state);
                await this.runtime.processActions(
                    message,
                    responseMessages,
                    state
                );
                // const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;
            } catch (error) {
                console.error(`Error sending response tweet: ${error}`);
            }
        }
    }
}

class FarcasterPostManager {
    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime
    ) {}

    public async start() {
        const generateNewTweetLoop = () => {
            this.generateNewTweet();
            setTimeout(
                generateNewTweetLoop,
                (Math.floor(Math.random() * (4 - 1 + 1)) + 1) * 60 * 60 * 1000
            ); // Random interval between 1 and 4 hours
        };
        // setTimeout(() => {
        generateNewTweetLoop();
    }

    private async generateNewTweet() {}
}

class FarcasterManager {
    posts: FarcasterManager;
    interactions: FarcasterInteractionManager;

    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime
    ) {
        this.posts = new FarcasterManager(client, runtime);
        this.interactions = new FarcasterInteractionManager(client, runtime);
    }

    async start() {
        this.posts.start();
        this.interactions.start();
    }
}

export const FarcasterAgentClient = {
    async start(runtime: IAgentRuntime): Promise<FarcasterManager> {
        const manager = new FarcasterManager(
            new FarcasterClient({
                ssl: true,
                url: runtime.getSetting("FARCASTER_HUB_URL"),
            }),
            runtime
        );

        await manager.start();

        return manager;
    },

    async stop(runtime: IAgentRuntime) {
        console.warn("Farcaster client does not support stopping yet");
    },
} satisfies Client;
