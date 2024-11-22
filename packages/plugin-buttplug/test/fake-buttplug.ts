import WebSocket from "ws";

interface DeviceHandshake {
    identifier: string;
    address: string;
    version: number;
}

export class DeviceSimulator {
    private ws: WebSocket | null = null;
    private readonly deviceAddress: string = "8A3D9FAC2A45";
    name = "LVS Test Device";
    private connected = false;
    private connectionPromise: Promise<void> | null = null;

    constructor() {
        console.log("[fake-buttplug] Initializing device simulator");
        this.connectionPromise = this.connect();
    }

    private async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(
                "[fake-buttplug] Attempting to connect to ws://127.0.0.1:54817"
            );
            this.ws = new WebSocket("ws://127.0.0.1:54817");

            const timeout = setTimeout(() => {
                console.log("[fake-buttplug] Connection timeout after 5000ms");
                reject(new Error("Connection timeout"));
            }, 5000);

            this.ws.on("open", () => {
                clearTimeout(timeout);
                this.connected = true;
                console.log("[fake-buttplug] Connection established");

                const handshake: DeviceHandshake = {
                    identifier: "Eliza Buttplug Device",
                    address: this.deviceAddress,
                    version: 0,
                };
                console.log(
                    "[fake-buttplug] Sending handshake:",
                    JSON.stringify(handshake)
                );
                this.ws?.send(JSON.stringify(handshake));
                resolve();
            });

            this.setupEventHandlers();
        });
    }

    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.on("message", (data: string) => {
            const message = data.toString();
            console.log("[fake-buttplug] Received:", message);

            if (message.startsWith("DeviceType;")) {
                console.log(
                    "[fake-buttplug] Responding to DeviceType with device info"
                );
                this.ws?.send(`Z:${this.deviceAddress}:10`);
            }
        });

        this.ws.on("error", (error: Error) => {
            console.log("[fake-buttplug] Error:", error.message);
            this.connected = false;
        });

        this.ws.on("close", (code: number, reason: Buffer) => {
            console.log("[fake-buttplug] Connection closed:", {
                code,
                reason: reason.toString(),
            });
            this.connected = false;
        });
    }

    private async ensureConnection(): Promise<void> {
        if (!this.connected) {
            console.log(
                "[fake-buttplug] Connection lost, attempting reconnect"
            );
            this.connectionPromise = this.connect();
        }
        if (this.connectionPromise) {
            await this.connectionPromise;
        }
    }

    async vibrate(speed: number) {
        await this.ensureConnection();
        if (!this.ws || !this.connected) {
            throw new Error("Device not connected");
        }
        const command = `Vibrate:${this.deviceAddress}:${Math.floor(speed * 100)}`;
        console.log("[fake-buttplug] Sending vibrate command:", command);
        this.ws.send(command);
        console.log(`[SIMULATION] Vibrating at ${speed * 100}%`);
    }

    async stop() {
        await this.ensureConnection();
        if (!this.ws || !this.connected) {
            throw new Error("Device not connected");
        }
        const command = `Vibrate:${this.deviceAddress}:0`;
        console.log("[fake-buttplug] Sending stop command:", command);
        this.ws.send(command);
        console.log("[SIMULATION] Stopped vibration");

        // Wait a moment to ensure command is sent
        await new Promise((r) => setTimeout(r, 100));
    }

    async disconnect() {
        if (this.ws) {
            console.log("[fake-buttplug] Starting disconnect sequence");
            // Ensure we stop before disconnecting
            try {
                await this.stop();
            } catch (err) {
                console.log(
                    "[fake-buttplug] Error during stop in disconnect:",
                    err
                );
            }

            // Wait a moment before closing
            await new Promise((r) => setTimeout(r, 100));

            console.log("[fake-buttplug] Closing WebSocket connection");
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.connectionPromise = null;
        console.log("[fake-buttplug] Disconnect complete");
    }
}

// If this file is run directly, create and maintain a simulator instance
if (import.meta.url === new URL(import.meta.url).href) {
    console.log("[fake-buttplug] Starting simulator service");
    const simulator = new DeviceSimulator();

    // Keep the process alive
    process.on("SIGINT", async () => {
        console.log("[fake-buttplug] Shutting down simulator service");
        await simulator.disconnect();
        process.exit(0);
    });
}
