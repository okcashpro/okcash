import { spawn } from "child_process";
import { promisify } from "util";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net
            .createServer()
            .once("error", () => resolve(false))
            .once("listening", () => {
                server.close();
                resolve(true);
            })
            .listen(port);
    });
}

export async function startIntifaceEngine(): Promise<void> {
    try {
        const child = spawn(
            path.join(__dirname, "../intiface-engine/intiface-engine"),
            [
                "--websocket-port",
                "12345",
                "--use-bluetooth-le",
                "--server-name",
                "Eliza Buttplugin Server",
            ],
            {
                detached: true,
                stdio: "ignore",
                windowsHide: true,
            }
        );

        // Unref the child process to allow the parent to exit independently
        child.unref();

        // Wait briefly to ensure the process starts
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
        throw new Error(`Failed to start Intiface Engine: ${error}`);
    }
}
