import {
    ButtplugClient,
    ButtplugNodeWebsocketClientConnector,
    ButtplugClientDevice,
} from "buttplug";
import { DeviceSimulator } from "./fake-buttplug";

interface TestDevice {
    name: string;
    vibrate(speed: number): Promise<void>;
    stop(): Promise<void>;
    disconnect(): Promise<void>;
}

class ButtplugDeviceWrapper implements TestDevice {
    constructor(
        private device: ButtplugClientDevice,
        private client: ButtplugClient
    ) {
        this.name = device.name;
    }
    name: string;

    async vibrate(speed: number) {
        try {
            await this.device.vibrate(speed);
            console.log(
                `[Simulation] Vibrating ${this.name} at ${speed * 100}%`
            );
        } catch (err) {
            console.error("Vibration error:", err);
            throw err;
        }
    }

    async stop() {
        try {
            await this.device.stop();
            console.log(`[Simulation] Stopping ${this.name}`);
        } catch (err) {
            console.error("Stop error:", err);
            throw err;
        }
    }

    async disconnect() {
        try {
            await this.device.stop();
            await this.client.disconnect();
        } catch (err) {
            console.error("Disconnect error:", err);
        }
    }
}

async function getTestDevice(): Promise<TestDevice> {
    const client = new ButtplugClient("Test Client");
    const connector = new ButtplugNodeWebsocketClientConnector(
        "ws://localhost:12345"
    );

    try {
        await client.connect(connector);

        // Set up event handlers
        client.on("deviceremoved", () => {
            console.log("Device disconnected");
        });

        await client.startScanning();

        // Wait a bit for device discovery
        await new Promise((r) => setTimeout(r, 2000));

        const devices = client.devices;
        if (devices.length > 0) {
            console.log("Using real Buttplug device:", devices[0].name);
            return new ButtplugDeviceWrapper(devices[0], client);
        }

        await client.disconnect();
        console.log("No real devices found, falling back to simulator");
        return new DeviceSimulator();
    } catch (err) {
        console.log("Couldn't connect to Buttplug server, using simulator");
        try {
            await client.disconnect();
        } catch {} // Ignore disconnect errors
        return new DeviceSimulator();
    }
}

async function main() {
    let device: TestDevice | null = null;
    try {
        device = await getTestDevice();
        console.log("Starting test sequence with:", device.name);

        // Wait for device to be fully ready
        await new Promise((r) => setTimeout(r, 1000));

        console.log("Vibrating at 50%");
        await device.vibrate(0.5);

        await new Promise((r) => setTimeout(r, 2000));

        console.log("Stopping device");
        await device.stop();

        // Wait for stop command to complete
        await new Promise((r) => setTimeout(r, 500));

        console.log("Test sequence completed");
    } catch (err) {
        console.error("Error during test:", err);
    } finally {
        if (device) {
            // Wait a moment before disconnecting
            await new Promise((r) => setTimeout(r, 500));
            try {
                await device.disconnect();
            } catch (err) {
                console.error("Error during disconnect:", err);
            }
        }
    }
}

main();
