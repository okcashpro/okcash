import { describe, expect, it } from "@jest/globals";

describe("Basic Test Suite", () => {
    it("should run a basic test", () => {
        expect(true).toBe(true);
    });

    it("should have access to environment variables", () => {
        expect(process.env.NODE_ENV).toBe("test");
        expect(process.env.TEST_DATABASE_CLIENT).toBe("sqlite");
    });
});
