import {
    composeContext,
    generateText,
    IAgentRuntime,
    ModelClass,
    stringToUuid,
    okaiLogger,
} from "@okcashpro/okai";
import { LensClient } from "./client";
import { formatTimeline, postTemplate } from "./prompts";
import { publicationUuid } from "./utils";
import { createPublicationMemory } from "./memory";
import { sendPublication } from "./actions";
import StorjProvider from "./providers/StorjProvider";

export class LensPostManager {
    private timeout: NodeJS.Timeout | undefined;

    constructor(
        public client: LensClient,
        public runtime: IAgentRuntime,
        private profileId: string,
        public cache: Map<string, any>,
        private ipfs: StorjProvider
    ) {}

    public async start() {
        const generateNewPubLoop = async () => {
            try {
                await this.generateNewPublication();
            } catch (error) {
                okaiLogger.error(error);
                return;
            }

            this.timeout = setTimeout(
                generateNewPubLoop,
                (Math.floor(Math.random() * (4 - 1 + 1)) + 1) * 60 * 60 * 1000
            ); // Random interval between 1 and 4 hours
        };

        generateNewPubLoop();
    }

    public async stop() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    private async generateNewPublication() {
        okaiLogger.info("Generating new publication");
        try {
            const profile = await this.client.getProfile(this.profileId);
            await this.runtime.ensureUserExists(
                this.runtime.agentId,
                profile.handle!,
                this.runtime.character.name,
                "lens"
            );

            const timeline = await this.client.getTimeline(this.profileId);

            // this.cache.set("lens/timeline", timeline);

            const formattedHomeTimeline = formatTimeline(
                this.runtime.character,
                timeline
            );

            const generateRoomId = stringToUuid("lens_generate_room");

            const state = await this.runtime.composeState(
                {
                    roomId: generateRoomId,
                    userId: this.runtime.agentId,
                    agentId: this.runtime.agentId,
                    content: { text: "", action: "" },
                },
                {
                    lensHandle: profile.handle,
                    timeline: formattedHomeTimeline,
                }
            );

            const context = composeContext({
                state,
                template:
                    this.runtime.character.templates?.lensPostTemplate ||
                    postTemplate,
            });

            const content = await generateText({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            if (this.runtime.getSetting("LENS_DRY_RUN") === "true") {
                okaiLogger.info(`Dry run: would have posted: ${content}`);
                return;
            }

            try {
                const { publication } = await sendPublication({
                    client: this.client,
                    runtime: this.runtime,
                    roomId: generateRoomId,
                    content: { text: content },
                    ipfs: this.ipfs,
                });

                if (!publication) throw new Error("failed to send publication");

                const roomId = publicationUuid({
                    agentId: this.runtime.agentId,
                    pubId: publication.id,
                });

                await this.runtime.ensureRoomExists(roomId);

                await this.runtime.ensureParticipantInRoom(
                    this.runtime.agentId,
                    roomId
                );

                okaiLogger.info(`[Lens Client] Published ${publication.id}`);

                await this.runtime.messageManager.createMemory(
                    createPublicationMemory({
                        roomId,
                        runtime: this.runtime,
                        publication,
                    })
                );
            } catch (error) {
                okaiLogger.error("Error sending publication:", error);
            }
        } catch (error) {
            okaiLogger.error("Error generating new publication:", error);
        }
    }
}
