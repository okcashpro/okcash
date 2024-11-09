import { describe, it, expect } from "vitest";
import {
    composeActionExamples,
    formatActionNames,
    formatActions,
} from "../actions";
import { Action } from "../types";

describe("actions", () => {
    const mockActions: Action[] = [
        {
            name: "Action1",
            description: "First action description",
            similes: ["greeting", "welcoming"],
            examples: [
                [
                    {
                        user: "user",
                        content: {
                            text: "Hello {{user1}}!",
                            action: "greet",
                        },
                    },
                ],
            ],
            handler: async () => {},
            validate: async () => true,
        },
        {
            name: "Action2",
            description: "Second action description",
            similes: ["talking", "conversing"],
            examples: [
                [
                    {
                        user: "user",
                        content: {
                            text: "{{user1}} talks to {{user2}}",
                            action: null,
                        },
                    },
                ],
            ],
            handler: async () => {},
            validate: async () => true,
        },
    ];

    describe("composeActionExamples", () => {
        it("should generate formatted examples with replaced usernames", () => {
            const result = composeActionExamples(mockActions, 2);

            expect(result).toBeTypeOf("string");
            expect(result).toContain("user:");
            expect(result).not.toContain("{{user1}}");
            expect(result).not.toContain("{{user2}}");
        });

        it("should respect the count parameter", () => {
            const result = composeActionExamples(mockActions, 1);
            const examples = result
                .split("\n")
                .filter((line) => line.length > 0);
            expect(examples).toHaveLength(1);
        });
    });

    describe("formatActionNames", () => {
        it("should return comma-separated action names", () => {
            const result = formatActionNames(mockActions);

            expect(result).toBeTypeOf("string");
            expect(result).toContain("Action1");
            expect(result).toContain("Action2");
            expect(result).toContain(", ");
        });
    });

    describe("formatActions", () => {
        it("should return formatted actions with descriptions", () => {
            const result = formatActions(mockActions);

            expect(result).toBeTypeOf("string");
            expect(result).toContain("Action1: First action description");
            expect(result).toContain("Action2: Second action description");
            expect(result).toContain(",\n");
        });
    });
});
