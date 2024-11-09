import { describe, it, expect } from "vitest";
import { composeContext, addHeader } from "../context";
import { State } from "../types";

describe("composeContext", () => {
    it("should replace placeholders with state values", () => {
        const state: State = {
            userName: "Alice",
            userAge: 30,
            bio: "",
            lore: "",
            messageDirections: "",
            postDirections: "",
            roomId: "aaaa-bbbb-cccc-dddd-eeee",
            actors: "",
            recentMessages: "",
            recentMessagesData: [],
        };
        const template = "Hello, {{userName}}! You are {{userAge}} years old.";

        const result = composeContext({ state, template });

        expect(result).toBe("Hello, Alice! You are 30 years old.");
    });

    it("should replace unknown placeholders with empty string", () => {
        const state: State = {
            userName: "Bob",
            bio: "",
            lore: "",
            messageDirections: "",
            postDirections: "",
            roomId: "aaaa-bbbb-cccc-dddd-eeee",
            actors: "",
            recentMessages: "",
            recentMessagesData: [],
        };
        const template = "Hello, {{userName}}! Your age is {{userAge}}.";

        const result = composeContext({ state, template });

        expect(result).toBe("Hello, Bob! Your age is .");
    });

    it("should handle empty template", () => {
        const state: State = {
            userName: "Charlie",
            bio: "",
            lore: "",
            messageDirections: "",
            postDirections: "",
            roomId: "aaaa-bbbb-cccc-dddd-eeee",
            actors: "",
            recentMessages: "",
            recentMessagesData: [],
        };
        const template = "";

        const result = composeContext({ state, template });

        expect(result).toBe("");
    });
});

describe("addHeader", () => {
    it("should combine header and body with newline", () => {
        const header = "Title";
        const body = "Content";

        const result = addHeader(header, body);

        expect(result).toBe("Title\nContent\n");
    });

    it("should return empty string if body is empty", () => {
        const header = "Title";
        const body = "";

        const result = addHeader(header, body);

        expect(result).toBe("");
    });
});
