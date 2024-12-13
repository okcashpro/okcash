import { elizaLogger, IAgentRuntime } from "@ai16z/eliza";
import {
    ChatMessage,
    ChatRoom,
    EchoChamberConfig,
    ModelInfo,
    ListRoomsResponse,
    RoomHistoryResponse,
    MessageResponse,
} from "./types";

const MAX_RETRIES = 3;

const RETRY_DELAY = 5000;

export class EchoChamberClient {
    private runtime: IAgentRuntime;
    private config: EchoChamberConfig;
    private apiUrl: string;
    private modelInfo: ModelInfo;
    private pollInterval: NodeJS.Timeout | null = null;
    private watchedRoom: string | null = null;

    constructor(runtime: IAgentRuntime, config: EchoChamberConfig) {
        this.runtime = runtime;
        this.config = config;
        this.apiUrl = `${config.apiUrl}/api/rooms`;
        this.modelInfo = {
            username: config.username || `agent-${runtime.agentId}`,
            model: config.model || runtime.modelProvider,
        };
    }

    public getUsername(): string {
        return this.modelInfo.username;
    }

    public getModelInfo(): ModelInfo {
        return { ...this.modelInfo };
    }

    public getConfig(): EchoChamberConfig {
        return { ...this.config };
    }

    private getAuthHeaders(): { [key: string]: string } {
        return {
            "Content-Type": "application/json",
            "x-api-key": this.config.apiKey,
        };
    }

    public async setWatchedRoom(roomId: string): Promise<void> {
        try {
            // Verify room exists
            const rooms = await this.listRooms();
            const room = rooms.find((r) => r.id === roomId);

            if (!room) {
                throw new Error(`Room ${roomId} not found`);
            }

            // Set new watched room
            this.watchedRoom = roomId;

            elizaLogger.success(`Now watching room: ${room.name}`);
        } catch (error) {
            elizaLogger.error("Error setting watched room:", error);
            throw error;
        }
    }

    public getWatchedRoom(): string | null {
        return this.watchedRoom;
    }

    private async retryOperation<T>(
        operation: () => Promise<T>,
        retries: number = MAX_RETRIES
    ): Promise<T> {
        for (let i = 0; i < retries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === retries - 1) throw error;
                const delay = RETRY_DELAY * Math.pow(2, i);
                elizaLogger.warn(`Retrying operation in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw new Error("Max retries exceeded");
    }

    public async start(): Promise<void> {
        elizaLogger.log("🚀 Starting EchoChamber client...");
        try {
            // Verify connection by listing rooms
            await this.retryOperation(() => this.listRooms());
            elizaLogger.success(
                `✅ EchoChamber client successfully started for ${this.modelInfo.username}`
            );

            // Join default room if specified and no specific room is being watched
            if (this.config.defaultRoom && !this.watchedRoom) {
                await this.setWatchedRoom(this.config.defaultRoom);
            }
        } catch (error) {
            elizaLogger.error("❌ Failed to start EchoChamber client:", error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        // Leave watched room if any
        if (this.watchedRoom) {
            try {
                this.watchedRoom = null;
            } catch (error) {
                elizaLogger.error(
                    `Error leaving room ${this.watchedRoom}:`,
                    error
                );
            }
        }

        elizaLogger.log("Stopping EchoChamber client...");
    }

    public async listRooms(tags?: string[]): Promise<ChatRoom[]> {
        try {
            const url = new URL(this.apiUrl);
            if (tags?.length) {
                url.searchParams.append("tags", tags.join(","));
            }

            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`Failed to list rooms: ${response.statusText}`);
            }

            const data = (await response.json()) as ListRoomsResponse;
            return data.rooms;
        } catch (error) {
            elizaLogger.error("Error listing rooms:", error);
            throw error;
        }
    }

    public async getRoomHistory(roomId: string): Promise<ChatMessage[]> {
        return this.retryOperation(async () => {
            const response = await fetch(`${this.apiUrl}/${roomId}/history`);
            if (!response.ok) {
                throw new Error(
                    `Failed to get room history: ${response.statusText}`
                );
            }

            const data = (await response.json()) as RoomHistoryResponse;
            return data.messages;
        });
    }

    public async sendMessage(
        roomId: string,
        content: string
    ): Promise<ChatMessage> {
        return this.retryOperation(async () => {
            const response = await fetch(`${this.apiUrl}/${roomId}/message`, {
                method: "POST",
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    content,
                    sender: this.modelInfo,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `Failed to send message: ${response.statusText}`
                );
            }

            const data = (await response.json()) as MessageResponse;
            return data.message;
        });
    }
}
