import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"], // Ensure you're targeting CommonJS
    loader: {
        ".cdc": "text",
    },
    external: [
        "dotenv", // Externalize dotenv to prevent bundling
        "fs", // Externalize fs to use Node.js built-in module
        "path", // Externalize other built-ins if necessary
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "safe-buffer",
        "base-x",
        "bs58",
        "borsh",
        "stream",
        "buffer",
        "querystring",
        "amqplib",
        // Add other modules you want to externalize
        "@onflow/fcl",
        "@onflow/types",
        "sha3",
        "elliptic",
    ],
});
