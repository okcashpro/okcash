import dotenv from "dotenv";
import { createRuntime } from "../src/test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../src/test_resources/getOrCreateRelationship.ts";
import { runAiTest } from "../src/test_resources/runAiTest.ts";
import { messageHandlerTemplate } from "../src/test_resources/templates.ts";
import {
    TEST_ACTION,
    TEST_ACTION_FAIL,
} from "../src/test_resources/testAction.ts";
import { type User } from "../src/test_resources/types.ts";
import { composeContext } from "../src/context.ts";
import { embeddingZeroVector } from "../src/memory.ts";
import {
    Content,
    IAgentRuntime,
    ModelClass,
    State,
    type Memory,
    type UUID,
} from "../src/types.ts";
import { stringToUuid } from "../src/uuid.ts";
import { generateMessageResponse } from "../src/generation.ts";
import { MemoryManager } from "@ai16z/eliza/src/index.ts";

async function handleMessage(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
) {
    const _saveRequestMessage = async (message: Memory, state: State) => {
        const { content: senderContent, userId, roomId } = message;

        const _senderContent = (senderContent as Content).text?.trim();
        if (_senderContent) {
            await runtime.messageManager.createMemory({
                id: stringToUuid(
                    message.id ?? userId + runtime.agentId + Date.now()
                ),
                userId: userId!,
                agentId: runtime.agentId,
                content: {
                    text: _senderContent,
                    action: (message.content as Content)?.action ?? "null",
                },
                roomId,
                embedding: embeddingZeroVector,
            });
            await runtime.evaluate(message, state);
        }
    };

    await _saveRequestMessage(message, state as State);
    if (!state) {
        state = (await runtime.composeState(message)) as State;
    }

    const context = composeContext({
        state,
        template: messageHandlerTemplate,
    });

    let responseContent: Content | null = null;
    const { userId, roomId } = message;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
        const response = await generateMessageResponse({
            context,
            runtime,
            modelClass: ModelClass.SMALL,
        });

        runtime.databaseAdapter.log({
            body: { message, context, response },
            userId: userId,
            roomId,
            type: "actions_test_completion",
        });
        return response;
    }

    if (!responseContent) {
        responseContent = {
            text: "",
            action: "IGNORE",
        };
    }

    if (responseContent.text) {
        const response = {
            userId: runtime.agentId,
            agentId: runtime.agentId,
            content: responseContent,
            roomId,
            embedding: embeddingZeroVector,
        };
        await runtime.messageManager.createMemory(response);

        state = await this.runtime.updateRecentMessageState(state);
        await runtime.processActions(message, [response], state);
        await runtime.evaluate(message, state);
    } else {
        console.warn("Empty response, skipping");
    }

    return responseContent;
}

// use .dev.vars for local testing
dotenv.config({ path: ".dev.vars" });

describe("Actions", () => {
    let user: User;
    let runtime: IAgentRuntime;
    let roomId: UUID;

    beforeAll(async () => {
        const { session, runtime: _runtime } = await createRuntime({
            env: process.env as Record<string, string>,
            actions: [TEST_ACTION, TEST_ACTION_FAIL],
        });

        user = session.user!;
        runtime = _runtime as IAgentRuntime;

        // check if the user id exists in the 'accounts' table
        // if it doesn't, create it with the name 'Test User'
        let account = await runtime.databaseAdapter.getAccountById(
            user.id as UUID
        );

        if (!account) {
            account = await runtime.databaseAdapter.getAccountById(
                user.id as UUID
            );
            if (!account) {
                await runtime.databaseAdapter.createAccount({
                    id: user.id as UUID,
                    username: "Test User",
                    name: "Test User",
                    email: user.email,
                    avatarUrl: "",
                });
            }
        }

        // get all relationships for user
        const data = await getOrCreateRelationship({
            runtime,
            userA: user.id as UUID,
            userB: "00000000-0000-0000-0000-000000000000" as UUID,
        });

        if (!data) {
            throw new Error("Relationship not found");
        }

        roomId = data!.roomId;

        await cleanup();
    });

    afterAll(async () => {
        await cleanup();
    });

    async function cleanup() {
        const factsManager = new MemoryManager({
            runtime,
            tableName: "facts",
        });

        await factsManager.removeAllMemories(roomId);
        await runtime.messageManager.removeAllMemories(roomId);
    }

    // Test that actions are being loaded into context properly
    test("Actions are loaded into context", async () => {
        const actions = runtime.actions;
        expect(actions).toBeDefined();
        expect(actions.length).toBeGreaterThan(0);
        // Ensure the TEST_ACTION action is part of the loaded actions
        const testAction = actions.find(
            (action) => action.name === "TEST_ACTION"
        );
        expect(testAction).toBeDefined();
    });

    // Test that actions are validated properly
    test("Test action is always valid", async () => {
        const testAction = runtime.actions.find(
            (action) => action.name === "TEST_ACTION"
        );
        expect(testAction).toBeDefined();
        if (testAction && testAction.validate) {
            const isValid = await testAction.validate(runtime, {
                userId: user.id as UUID,
                agentId: runtime.agentId,
                content: { text: "Test message" },
                roomId: roomId,
            });
            expect(isValid).toBeTruthy();
        } else {
            throw new Error(
                "Continue action or its validation function is undefined"
            );
        }
    });

    test("Test that actions are properly validated in state", async () => {
        const message: Memory = {
            agentId: runtime.agentId,
            userId: user.id as UUID,
            content: {
                text: "Please respond with the message 'ok' and the action TEST_ACTION",
            },
            roomId,
        };

        const state = await runtime.composeState(message);
        expect(state.actionNames).not.toContain("TEST_ACTION_FAIL");

        expect(state.actionNames).toContain("TEST_ACTION");
    });

    // Validate that TEST_ACTION is in the state
    test("Validate that TEST_ACTION is in the state", async () => {
        await runAiTest("Validate TEST_ACTION is in the state", async () => {
            const message: Memory = {
                agentId: runtime.agentId,
                userId: user.id as UUID,
                content: {
                    text: "Please respond with the message 'ok' and the action TEST_ACTION",
                },
                roomId,
            };

            const response = await handleMessage(runtime, message);
            return response.action === "TEST_ACTION"; // Return true if the expected action matches
        });
    }, 60000);

    // Test that TEST_ACTION action handler is called properly
    test("Test action handler is called", async () => {
        await runAiTest("Test action handler is called", async () => {
            const testAction = runtime.actions.find(
                (action) => action.name === "TEST_ACTION"
            );
            if (!testAction || !testAction.handler) {
                console.error(
                    "Continue action or its handler function is undefined"
                );
                return false; // Return false to indicate the test setup failed
            }

            const mockMessage: Memory = {
                userId: user.id as UUID,
                agentId: runtime.agentId,
                content: {
                    text: "Test message for TEST action",
                },
                roomId,
            };

            const response = await testAction.handler(runtime, mockMessage);
            return response !== undefined; // Return true if the handler returns a defined response
        });
    }, 60000); // You can adjust the timeout if needed
});
