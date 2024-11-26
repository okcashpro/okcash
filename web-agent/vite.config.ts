import path from "path";
import wasm from "vite-plugin-wasm";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [wasm()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    optimizeDeps: {
        exclude: ["onnxruntime-node", "@anush008/tokenizers"],
    },
    build: {
        commonjsOptions: {
            exclude: ["onnxruntime-node", "@anush008/tokenizers"],
        },
        rollupOptions: {
            external: ["onnxruntime-node", "@anush008/tokenizers"],
        },
    },
    // server: {
    //     proxy: {
    //         "/api": {
    //             target: "http://localhost:3000",
    //             changeOrigin: true,
    //             rewrite: (path) => path.replace(/^\/api/, ""),
    //         },
    //     },
    // },
});
