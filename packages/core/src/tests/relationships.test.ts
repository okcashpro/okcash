import dotenv from "dotenv";
import { zeroUuid } from "../src/test_resources/constants.ts";
import { createRuntime } from "../src/test_resources/createRuntime.ts"; // Adjust the import path as needed
import { getOrCreateRelationship } from "../src/test_resources/getOrCreateRelationship.ts";
import { type User } from "../src/test_resources/types.ts";
import { createRelationship, getRelationships } from "../src/relationships.ts"; // Adjust the import path as needed
import { IAgentRuntime, type UUID } from "../src/types.ts";

dotenv.config({ path: ".dev.vars" });

describe("Relationships Module", () => {
    let runtime: IAgentRuntime;
    let user: User;

    beforeAll(async () => {
        const setup = await createRuntime({
            env: process.env as Record<string, string>,
        });
        runtime = setup.runtime;
        user = setup.session.user;
        if (!user.id) {
            throw new Error("User ID is undefined");
        }
    });

    test("createRelationship creates a new relationship", async () => {
        const userA = user.id as UUID;
        const userB = zeroUuid;
        if (userA === undefined) throw new Error("userA is undefined");
        const relationship = await createRelationship({
            runtime,
            userA,
            userB,
        });
        expect(relationship).toBe(true);
    });

    test("getRelationship retrieves an existing relationship", async () => {
        const userA = user?.id as UUID;
        const userB = zeroUuid;

        await createRelationship({ runtime, userA, userB });

        const relationship = await getOrCreateRelationship({
            runtime,
            userA,
            userB,
        });
        expect(relationship).toBeDefined();
        expect(relationship?.userA).toBe(userA);
        expect(relationship?.userB).toBe(userB);
    });

    test("getRelationships retrieves all relationships for a user", async () => {
        const userA = user?.id as UUID;
        const userB = zeroUuid;

        await createRelationship({ runtime, userA, userB });

        const relationships = await getRelationships({
            runtime,
            userId: userA,
        });
        expect(relationships).toBeDefined();
        expect(relationships.length).toBeGreaterThan(0);
        expect(
            relationships.some((r) => r.userA === userA || r.userB === userA)
        ).toBeTruthy();
    });
});
