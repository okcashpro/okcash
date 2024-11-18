import {
    composeContext,
    generateText,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
} from "@ai16z/eliza";
import { FarcasterClient } from "./client";
import {
    CastAddMessage,
    FarcasterNetwork,
    isCastAddMessage,
    Signer,
} from "@farcaster/hub-nodejs";
import { Cast } from "./types";
import { formatTimeline, postTemplate } from "./prompts";
import { toHex } from "viem";
import { castUuid } from "./utils";
import { createCastMemory } from "./memory";
import { sendCast } from "./actions";

export class FarcasterPostManager {
    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime,
        private signer: Signer
    ) {}

    public async start() {
        const generateNewPostLoop = () => {
            this.generateNewPost();
            setTimeout(
                generateNewPostLoop,
                (Math.floor(Math.random() * (4 - 1 + 1)) + 1) * 60 * 60 * 1000
            ); // Random interval between 1 and 4 hours
        };

        generateNewPostLoop();
    }

    private async generateNewPost() {
        console.log("Generating new tweet");
        try {
            const fid = Number(this.runtime.getSetting("FARCASTER_FID")!);
            // const farcasterUserName =
            //     this.runtime.getSetting("FARCASTER_USERNAME")!;

            const profile = await this.client.getProfile(fid);

            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                profile.username,
                this.runtime.character.name,
                "farcaster"
            );

            const { timeline } = await this.client.getTimeline({
                fid,
                pageSize: 10,
                profile,
            });

            const formattedHomeTimeline = formatTimeline(
                this.runtime.character,
                timeline
            );

            const generateRoomId = stringToUuid("farcaster_generate_room");

            const state = await this.runtime.composeState(
                {
                    roomId: generateRoomId,
                    userId: this.runtime.agentId,
                    agentId: this.runtime.agentId,
                    content: { text: "", action: "" },
                },
                {
                    farcasterUserName: profile.username,
                    timeline: formattedHomeTimeline,
                }
            );

            // Generate new tweet
            const context = composeContext({
                state,
                template:
                    this.runtime.character.templates?.farcasterPostTemplate ||
                    postTemplate,
            });

            const content = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            // const slice = newTweetContent.replaceAll(/\\n/g, "\n").trim();

            // const contentLength = 240;

            // let content = slice.slice(0, contentLength);
            // // if its bigger than 280, delete the last line
            // if (content.length > 280) {
            //     content = content.slice(0, content.lastIndexOf("\n"));
            // }

            // if (content.length > contentLength) {
            //     // slice at the last period
            //     content = content.slice(0, content.lastIndexOf("."));
            // }

            // // if it's still too long, get the period before the last period
            // if (content.length > contentLength) {
            //     content = content.slice(0, content.lastIndexOf("."));
            // }

            try {
                const [{ cast }] = await sendCast({
                    client: this.client,
                    runtime: this.runtime,
                    signer: this.signer,
                    network: FarcasterNetwork.MAINNET,
                    roomId: generateRoomId,
                    content: { text: content },
                    profile,
                });

                const castHash = toHex(cast.hash);

                const roomId = castUuid({
                    agentId: this.runtime.agentId,
                    hash: castHash,
                });

                await this.runtime.ensureRoomExists(roomId);

                await this.runtime.ensureParticipantInRoom(
                    this.runtime.agentId,
                    roomId
                );

                await this.runtime.messageManager.createMemory(
                    createCastMemory({
                        roomId,
                        userId: this.runtime.agentId,
                        agentId: this.runtime.agentId,
                        cast,
                    })
                );
            } catch (error) {
                console.error("Error sending tweet:", error);
            }
        } catch (error) {
            console.error("Error generating new tweet:", error);
        }
    }
}
