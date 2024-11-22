import { ButtplugClient, ButtplugNodeWebsocketClientConnector } from "buttplug";
import { validateButtplugConfig, type ButtplugConfig } from "./enviroment";
import type {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
} from "@ai16z/eliza";
import { Service, ServiceType } from "@ai16z/eliza";
import { isPortAvailable, startIntifaceEngine } from "./utils";

export interface IButtplugService extends Service {
    vibrate(strength: number, duration: number): Promise<void>;
    isConnected(): boolean;
    getDevices(): any[];
}

export class ButtplugService extends Service implements IButtplugService {
    static serviceType: ServiceType = ServiceType.BUTTPLUG;
    private client: ButtplugClient;
    private connected = false;
    private devices: Map<string, any> = new Map();
    private vibrateQueue: VibrateEvent[] = [];
    private isProcessingQueue = false;
    private config: ButtplugConfig | null = null;
    private maxVibrationIntensity = 1;
    private rampUpAndDown = false;
    private rampSteps = 20;

    constructor() {
        super();
        this.client = new ButtplugClient("Temporary Name");

        this.client.addListener(
            "deviceadded",
            this.handleDeviceAdded.bind(this)
        );
        this.client.addListener(
            "deviceremoved",
            this.handleDeviceRemoved.bind(this)
        );
    }

    getInstance(): IButtplugService {
        return this;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        // Validate config before connecting
        this.config = await validateButtplugConfig(runtime);

        // Update client name from config
        this.client = new ButtplugClient(this.config.INTIFACE_NAME);

        if (this.config.INTIFACE_URL) {
            await this.connect();
        }
    }

    async connect() {
        if (this.connected || !this.config) return;

        const portAvailable = await isPortAvailable(12345);

        if (portAvailable) {
            try {
                await startIntifaceEngine();
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (error) {
                console.error("Failed to start Intiface Engine:", error);
                throw error;
            }
        } else {
            console.log(
                "Port 12345 is in use, assuming Intiface is already running"
            );
        }

        const connector = new ButtplugNodeWebsocketClientConnector(
            this.config.INTIFACE_URL
        );

        try {
            await this.client.connect(connector);
            this.connected = true;
            await this.client.startScanning();
        } catch (error) {
            console.error("Failed to connect to Buttplug server:", error);
            throw error;
        }
    }

    async disconnect() {
        if (!this.connected) return;
        await this.client.disconnect();
        this.connected = false;
        this.devices.clear();
    }

    private handleDeviceAdded(device: any) {
        this.devices.set(device.name, device);
        console.log(`Device connected: ${device.name}`);
    }

    private handleDeviceRemoved(device: any) {
        this.devices.delete(device.name);
        console.log(`Device disconnected: ${device.name}`);
    }

    async vibrateAll(intensity: number) {
        for (const device of this.devices.values()) {
            if (device.vibrateCmd) {
                await device.vibrate(intensity);
            }
        }
    }

    async stopAll() {
        for (const device of this.devices.values()) {
            if (device.stop) {
                await device.stop();
            }
        }
    }

    getDevices() {
        return Array.from(this.devices.values());
    }

    isConnected() {
        return this.connected;
    }

    private async addToVibrateQueue(event: VibrateEvent) {
        this.vibrateQueue.push(event);
        if (!this.isProcessingQueue) {
            this.isProcessingQueue = true;
            await this.processVibrateQueue();
        }
    }

    private async processVibrateQueue() {
        while (this.vibrateQueue.length > 0) {
            const event = this.vibrateQueue[0];
            await this.handleVibrate(event);
            this.vibrateQueue.shift();
        }
        this.isProcessingQueue = false;
    }

    private async handleVibrate(event: VibrateEvent) {
        if (!this.connected) return;

        let strength = Math.min(event.strength, this.maxVibrationIntensity);

        if (this.rampUpAndDown) {
            await this.rampedVibrate(strength, event.duration);
        } else {
            await this.vibrateAll(strength);
            await new Promise((r) => setTimeout(r, event.duration));
            await this.stopAll();
        }
    }

    private async rampedVibrate(targetStrength: number, duration: number) {
        const stepTime = (duration * 0.2) / this.rampSteps;

        // Ramp up
        for (let i = 0; i <= this.rampSteps; i++) {
            const intensity = (targetStrength / this.rampSteps) * i;
            await this.vibrateAll(intensity);
            await new Promise((r) => setTimeout(r, stepTime));
        }

        // Hold
        await new Promise((r) => setTimeout(r, duration * 0.6));

        // Ramp down
        for (let i = this.rampSteps; i >= 0; i--) {
            const intensity = (targetStrength / this.rampSteps) * i;
            await this.vibrateAll(intensity);
            await new Promise((r) => setTimeout(r, stepTime));
        }

        await this.stopAll();
    }

    async vibrate(strength: number, duration: number) {
        await this.addToVibrateQueue({
            strength,
            duration,
        });
    }
}

const vibrateAction: Action = {
    name: "VIBRATE",
    similes: ["VIBRATE_TOY", "VIBRATE_DEVICE", "START_VIBRATION", "BUZZ"],
    description: "Control vibration intensity of connected devices",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        try {
            await validateButtplugConfig(runtime);
            return true;
        } catch {
            return false;
        }
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        const service = runtime.getService<IButtplugService>(
            ServiceType.BUTTPLUG
        );
        if (!service) {
            throw new Error("Buttplug service not available");
        }

        // Extract intensity and duration from message
        // Default to 50% intensity for 2 seconds if not specified
        const intensity = options?.intensity ?? 0.5;
        const duration = options?.duration ?? 2000;

        await service.vibrate(intensity, duration);

        callback({
            text: `Vibrating at ${intensity * 100}% intensity for ${duration}ms`,
        });
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Vibrate the toy at 70% for 3 seconds" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Vibrating at 70% intensity for 3000ms",
                    action: "VIBRATE",
                    options: { intensity: 0.7, duration: 3000 },
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Start vibrating" },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Vibrating at 50% intensity for 2000ms",
                    action: "VIBRATE",
                },
            },
        ],
    ],
};

interface VibrateEvent {
    duration: number;
    strength: number;
    deviceId?: number;
}

export const buttplugPlugin: Plugin = {
    name: "buttplug",
    description: "Controls intimate hardware devices",
    actions: [vibrateAction],
    evaluators: [],
    providers: [],
    services: [new ButtplugService()],
};

export default buttplugPlugin;
