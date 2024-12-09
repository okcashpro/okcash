import {
    composeContext,
    generateText,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
    elizaLogger
} from "@ai16z/eliza";
import { FarcasterClient } from "./client";
import { formatTimeline, postTemplate } from "./prompts";
import { castUuid } from "./utils";
import { createCastMemory } from "./memory";
import { sendCast } from "./actions";

export class FarcasterPostManager {
    private timeout: NodeJS.Timeout | undefined;

    constructor(
        public client: FarcasterClient,
        public runtime: IAgentRuntime,
        private signerUuid: string,
        public cache: Map<string, any>
    ) {}

    public async start() {
        const generateNewCastLoop = async () => {
            try {
                await this.generateNewCast();
            } catch (error) {
                elizaLogger.error(error)
                return;
            }

            this.timeout = setTimeout(
                generateNewCastLoop,
                (Math.floor(Math.random() * (4 - 1 + 1)) + 1) * 60 * 60 * 1000
            ); // Random interval between 1 and 4 hours
        };

        generateNewCastLoop();
    }

    public async stop() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    private async generateNewCast() {
        elizaLogger.info("Generating new cast");
        try {
            const fid = Number(this.runtime.getSetting("FARCASTER_FID")!);

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
            });

            this.cache.set("farcaster/timeline", timeline);

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

            // Generate new cast
            const context = composeContext({
                state,
                template:
                    this.runtime.character.templates?.farcasterPostTemplate ||
                    postTemplate,
            });

            const newContent = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            const slice = newContent.replaceAll(/\\n/g, "\n").trim();

            const contentLength = 240;

            let content = slice.slice(0, contentLength);

            // if its bigger than 280, delete the last line
            if (content.length > 280) {
                content = content.slice(0, content.lastIndexOf("\n"));
            }

            if (content.length > contentLength) {
                // slice at the last period
                content = content.slice(0, content.lastIndexOf("."));
            }

            // if it's still too long, get the period before the last period
            if (content.length > contentLength) {
                content = content.slice(0, content.lastIndexOf("."));
            }


            if (this.runtime.getSetting("FARCASTER_DRY_RUN") === "true") {
                elizaLogger.info(
                    `Dry run: would have cast: ${content}`
                );
                return;
            }

            try {
                const [{ cast }] = await sendCast({
                    client: this.client,
                    runtime: this.runtime,
                    signerUuid: this.signerUuid,
                    roomId: generateRoomId,
                    content: { text: content },
                    profile,
                });

                const roomId = castUuid({
                    agentId: this.runtime.agentId,
                    hash: cast.hash,
                });

                await this.runtime.ensureRoomExists(roomId);

                await this.runtime.ensureParticipantInRoom(
                    this.runtime.agentId,
                    roomId
                );

                elizaLogger.info(`[Farcaster Neynar Client] Published cast ${cast.hash}`);

                await this.runtime.messageManager.createMemory(
                    createCastMemory({
                        roomId,
                        runtime: this.runtime,
                        cast,
                    })
                );
            } catch (error) {
                elizaLogger.error("Error sending cast:", error)
            }
        } catch (error) {
            elizaLogger.error("Error generating new cast:", error)
        }
    }
}
