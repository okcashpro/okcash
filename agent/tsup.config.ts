import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
});
