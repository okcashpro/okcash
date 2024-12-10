import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Environment Setup", () => {
    it("should verify .env.test file exists", () => {
        const possiblePaths = [
            path.join(process.cwd(), ".env.test"),
            path.join(process.cwd(), "packages/core/.env.test"),
            path.join(__dirname, "../../.env.test"),
            path.join(__dirname, "../.env.test"),
            path.join(__dirname, ".env.test"),
        ];

        console.log("Current working directory:", process.cwd());
        console.log("__dirname:", __dirname);

        const existingPaths = possiblePaths.filter((p) => {
            const exists = fs.existsSync(p);
            console.log(`Path ${p} exists: ${exists}`);
            return exists;
        });

        expect(existingPaths.length).toBeGreaterThan(0);
    });
});
