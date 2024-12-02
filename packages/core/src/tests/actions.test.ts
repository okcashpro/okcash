import { describe, expect, it } from "vitest";
import {
    composeActionExamples,
    formatActionNames,
    formatActions,
} from "../actions";
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "../types";

describe("Actions", () => {
    const mockActions: Action[] = [
        {
            name: "greet",
            description: "Greet someone",
            examples: [
                [
                    { user: "user1", content: { text: "Hello {{user2}}!" } },
                    {
                        user: "user2",
                        content: { text: "Hi {{user1}}!", action: "wave" },
                    },
                ],
            ],
            similes: [],
            handler: function (
                _runtime: IAgentRuntime,
                _message: Memory,
                _state?: State,
                _options?: { [key: string]: unknown },
                _callback?: HandlerCallback
            ): Promise<unknown> {
                throw new Error("Function not implemented.");
            },
            validate: function (
                _runtime: IAgentRuntime,
                _message: Memory,
                _state?: State
            ): Promise<boolean> {
                throw new Error("Function not implemented.");
            },
        },
        {
            name: "farewell",
            description: "Say goodbye",
            examples: [
                [
                    { user: "user1", content: { text: "Goodbye {{user2}}!" } },
                    {
                        user: "user2",
                        content: { text: "See you later {{user1}}!" },
                    },
                ],
            ],
            similes: [],
            handler: function (
                _runtime: IAgentRuntime,
                _message: Memory,
                _state?: State,
                _options?: { [key: string]: unknown },
                _callback?: HandlerCallback
            ): Promise<unknown> {
                throw new Error("Function not implemented.");
            },
            validate: function (
                _runtime: IAgentRuntime,
                _message: Memory,
                _state?: State
            ): Promise<boolean> {
                throw new Error("Function not implemented.");
            },
        },
    ];

    describe("composeActionExamples", () => {
        it("should generate the correct number of examples", () => {
            const result = composeActionExamples(mockActions, 1);
            const exampleLines = result
                .split("\n")
                .filter((line) => line.length > 0);
            expect(exampleLines.length).toBe(2); // Each example has 2 messages
        });

        it("should replace placeholder names with generated names", () => {
            const result = composeActionExamples(mockActions, 1);
            expect(result).not.toContain("{{user1}}");
            expect(result).not.toContain("{{user2}}");
        });
    });

    describe("formatActionNames", () => {
        it("should format action names correctly", () => {
            const result = formatActionNames(mockActions);
            const names = result.split(", ").sort();
            expect(names).toEqual(["farewell", "greet"].sort());
        });

        it("should return empty string for empty array", () => {
            const result = formatActionNames([]);
            expect(result).toBe("");
        });
    });

    describe("formatActions", () => {
        it("should format actions with descriptions correctly", () => {
            const result = formatActions(mockActions);
            const formattedActions = result.split(",\n").sort();
            expect(formattedActions).toEqual(
                ["farewell: Say goodbye", "greet: Greet someone"].sort()
            );
        });

        it("should return empty string for empty array", () => {
            const result = formatActions([]);
            expect(result).toBe("");
        });
    });
});
