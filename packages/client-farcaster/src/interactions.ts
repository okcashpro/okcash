import {
    composeContext,
    generateMessageResponse,
    generateShouldRespond,
    Memory,
    ModelClass,
    stringToUuid,
    type IAgentRuntime,
} from "@ai16z/eliza";
import { isCastAddMessage, type Signer } from "@farcaster/hub-nodejs";
import type { FarcasterClient } from "./client";
import { toHex } from "viem";
import { buildConversationThread, createCastMemory } from "./memory";
import { Cast, Profile } from "./types";
import {
    formatCast,
    formatTimeline,
    messageHandlerTemplate,
    shouldRespondTemplate,
} from "./prompts";
import { castUuid } from "./utils";
import { sendCast } from "./actions";

export class FarcasterInteractionManager {
    private timeout: NodeJS.Timeout | undefined;
    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime,
        private signer: Signer,
        public cache: Map<string, any>
    ) {}

    public async start() {
        const handleInteractionsLoop = async () => {
            try {
                await this.handleInteractions();
            } catch (error) {
                console.error(error);
                return;
            }

            this.timeout = setTimeout(
                handleInteractionsLoop,
                (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000
            ); // Random interval between 2-5 minutes
        };

        handleInteractionsLoop();
    }

    public async stop() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    private async handleInteractions() {
        const agentFid = Number(this.runtime.getSetting("FARCASTER_FID"));

        const { messages } = await this.client.getMentions({
            fid: agentFid,
        });

        const agent = await this.client.getProfile(agentFid);

        for (const mention of messages) {
            if (!isCastAddMessage(mention)) continue;

            const messageHash = toHex(mention.hash);
            const messageSigner = toHex(mention.signer);
            const conversationId = `${messageHash}-${this.runtime.agentId}`;
            const roomId = stringToUuid(conversationId);
            const userId = stringToUuid(messageSigner);

            const cast = await this.client.loadCastFromMessage(mention);

            await this.runtime.ensureConnection(
                userId,
                roomId,
                cast.profile.username,
                cast.profile.name,
                "farcaster"
            );

            await buildConversationThread({
                client: this.client,
                runtime: this.runtime,
                cast,
            });

            const memory: Memory = {
                content: { text: mention.data.castAddBody.text },
                agentId: this.runtime.agentId,
                userId,
                roomId,
            };

            await this.handleCast({
                agent,
                cast,
                memory,
            });
        }
    }

    private async handleCast({
        agent,
        cast,
        memory,
    }: {
        agent: Profile;
        cast: Cast;
        memory: Memory;
    }) {
        if (cast.profile.fid === agent.fid) {
            console.log("skipping cast from bot itself", cast.id);
            return;
        }

        if (!memory.content.text) {
            console.log("skipping cast with no text", cast.id);
            return { text: "", action: "IGNORE" };
        }

        const currentPost = formatCast(cast);

        const { timeline } = await this.client.getTimeline({
            fid: agent.fid,
            pageSize: 10,
        });

        const formattedTimeline = formatTimeline(
            this.runtime.character,
            timeline
        );

        const state = await this.runtime.composeState(memory, {
            farcasterUsername: agent.username,
            timeline: formattedTimeline,
            currentPost,
        });

        const shouldRespondContext = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.farcasterShouldRespondTemplate ||
                this.runtime.character?.templates?.shouldRespondTemplate ||
                shouldRespondTemplate,
        });

        const memoryId = castUuid({
            agentId: this.runtime.agentId,
            hash: cast.id,
        });

        const castMemory =
            await this.runtime.messageManager.getMemoryById(memoryId);

        if (!castMemory) {
            await this.runtime.messageManager.createMemory(
                createCastMemory({
                    roomId: memory.roomId,
                    runtime: this.runtime,
                    cast,
                })
            );
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
                    ?.farcasterMessageHandlerTemplate ??
                this.runtime.character?.templates?.messageHandlerTemplate ??
                messageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        response.inReplyTo = memoryId;

        if (!response.text) return;

        try {
            const results = await sendCast({
                runtime: this.runtime,
                client: this.client,
                signer: this.signer,
                profile: cast.profile,
                content: response,
                roomId: memory.roomId,
                inReplyTo: {
                    fid: cast.message.data.fid,
                    hash: cast.message.hash,
                },
            });

            const newState = await this.runtime.updateRecentMessageState(state);

            for (const { memory } of results) {
                await this.runtime.messageManager.createMemory(memory);
            }

            await this.runtime.evaluate(memory, newState);

            await this.runtime.processActions(
                memory,
                results.map((result) => result.memory),
                newState
            );
        } catch (error) {
            console.error(`Error sending response cast: ${error}`);
        }
    }
}
