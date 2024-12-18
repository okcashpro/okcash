import { describe, expect, it } from "vitest";
import {
    composeActionExamples,
    formatActionNames,
    formatActions,
} from "../actions";
import { Action } from "../types";

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
                [
                    { user: "user1", content: { text: "Hey {{user2}}, how are you?" } },
                    { user: "user2", content: { text: "I'm good {{user1}}, thanks!" } },
                ],
            ],
            similes: ["say hi", "welcome"],
            handler: async () => { throw new Error("Not implemented"); },
            validate: async () => { throw new Error("Not implemented"); },
        },
        {
            name: "farewell",
            description: "Say goodbye",
            examples: [
                [
                    { user: "user1", content: { text: "Goodbye {{user2}}!" } },
                    { user: "user2", content: { text: "Bye {{user1}}!" } },
                ],
            ],
            similes: ["say bye", "leave"],
            handler: async () => { throw new Error("Not implemented"); },
            validate: async () => { throw new Error("Not implemented"); },
        },
        {
            name: "help",
            description: "Get assistance",
            examples: [
                [
                    { user: "user1", content: { text: "Can you help me {{user2}}?" } },
                    {
                        user: "user2",
                        content: { text: "Of course {{user1}}, what do you need?", action: "assist" }
                    },
                ],
            ],
            similes: ["assist", "support"],
            handler: async () => { throw new Error("Not implemented"); },
            validate: async () => { throw new Error("Not implemented"); },
        },
    ];

    describe("composeActionExamples", () => {
        it("should generate examples with correct format", () => {
            const examples = composeActionExamples(mockActions, 1);
            const lines = examples.trim().split("\n");
            expect(lines.length).toBeGreaterThan(0);
            expect(lines[0]).toMatch(/^user\d: .+/);
        });

        it("should replace user placeholders with generated names", () => {
            const examples = composeActionExamples(mockActions, 1);
            expect(examples).not.toContain("{{user1}}");
            expect(examples).not.toContain("{{user2}}");
        });

        it("should handle empty actions array", () => {
            const examples = composeActionExamples([], 5);
            expect(examples).toBe("");
        });

        it("should handle count larger than available examples", () => {
            const examples = composeActionExamples(mockActions, 10);
            expect(examples.length).toBeGreaterThan(0);
        });
    });

    describe("formatActionNames", () => {
        it("should format action names correctly", () => {
            const formatted = formatActionNames([mockActions[0], mockActions[1]]);
            expect(formatted).toMatch(/^(greet|farewell)(, (greet|farewell))?$/);
        });

        it("should handle single action", () => {
            const formatted = formatActionNames([mockActions[0]]);
            expect(formatted).toBe("greet");
        });

        it("should handle empty actions array", () => {
            const formatted = formatActionNames([]);
            expect(formatted).toBe("");
        });
    });

    describe("formatActions", () => {
        it("should format actions with descriptions", () => {
            const formatted = formatActions([mockActions[0]]);
            expect(formatted).toBe("greet: Greet someone");
        });

        it("should include commas and newlines between multiple actions", () => {
            const formatted = formatActions([mockActions[0], mockActions[1]]);
            const parts = formatted.split(",\n");
            expect(parts.length).toBe(2);
            expect(parts[0]).toMatch(/^(greet|farewell): /);
            expect(parts[1]).toMatch(/^(greet|farewell): /);
        });

        it("should handle empty actions array", () => {
            const formatted = formatActions([]);
            expect(formatted).toBe("");
        });
    });

    describe("Action Structure", () => {
        it("should validate action structure", () => {
            mockActions.forEach(action => {
                expect(action).toHaveProperty("name");
                expect(action).toHaveProperty("description");
                expect(action).toHaveProperty("examples");
                expect(action).toHaveProperty("similes");
                expect(action).toHaveProperty("handler");
                expect(action).toHaveProperty("validate");
                expect(Array.isArray(action.examples)).toBe(true);
                expect(Array.isArray(action.similes)).toBe(true);
            });
        });

        it("should validate example structure", () => {
            mockActions.forEach(action => {
                action.examples.forEach(example => {
                    example.forEach(message => {
                        expect(message).toHaveProperty("user");
                        expect(message).toHaveProperty("content");
                        expect(message.content).toHaveProperty("text");
                    });
                });
            });
        });

        it("should have unique action names", () => {
            const names = mockActions.map(action => action.name);
            const uniqueNames = new Set(names);
            expect(names.length).toBe(uniqueNames.size);
        });
    });
});
