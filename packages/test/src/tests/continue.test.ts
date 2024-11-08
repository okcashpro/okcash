import dotenv from "dotenv";
import { Content, IAgentRuntime, Memory, type UUID } from "../src/types.ts";
import { zeroUuid } from "../src/test_resources/constants.ts";
import { createRuntime } from "../src/test_resources/createRuntime.ts";
import { Goodbye1 } from "../src/test_resources/data.ts";
import { getOrCreateRelationship } from "../src/test_resources/getOrCreateRelationship.ts";
import { populateMemories } from "../src/test_resources/populateMemories.ts";
import { runAiTest } from "../src/test_resources/runAiTest.ts";
import { type User } from "../src/test_resources/types.ts";
import action from "../src/actions/continue.ts";
import ignore from "../src/actions/ignore.ts";
import { MemoryManager } from "@ai16z/eliza/src/memory.ts";

dotenv.config({ path: ".dev.vars" });

const GetContinueExample1 = (_userId: UUID) => [
    {
        userId: zeroUuid,
        content: {
            text: "Hmm, let think for a second, I was going to tell you about something...",
            action: "CONTINUE",
        },
    },
    {
        userId: zeroUuid,
        content: {
            text: "I remember now, I was going to tell you about my favorite food, which is pizza.",
            action: "CONTINUE",
        },
    },
    {
        userId: zeroUuid,
        content: {
            text: "I love pizza, it's so delicious.",
            action: "CONTINUE",
        },
    },
];

describe("User Profile", () => {
    let user: User;
    let runtime: IAgentRuntime;
    let roomId: UUID = zeroUuid;

    afterAll(async () => {
        await cleanup();
    });

    beforeAll(async () => {
        const setup = await createRuntime({
            env: process.env as Record<string, string>,
            actions: [action, ignore],
        });
        user = setup.session.user;
        runtime = setup.runtime;

        const data = await getOrCreateRelationship({
            runtime,
            userA: user.id as UUID,
            userB: zeroUuid,
        });

        roomId = data.roomId;

        await cleanup();
    });

    beforeEach(async () => {
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

    // test validate function response

    test("Test validate function response", async () => {
        await runAiTest("Test validate function response", async () => {
            const message: Memory = {
                userId: user.id as UUID,
                content: { text: "Hello" },
                roomId: roomId as UUID,
            };

            const validate = action.validate!;

            const result = await validate(runtime, message);

            // try again with GetContinueExample1, expect to be false
            await populateMemories(runtime, user, roomId, [
                GetContinueExample1,
            ]);

            const message2: Memory = {
                userId: zeroUuid as UUID,
                content: {
                    text: "Hello",
                    action: "CONTINUE",
                },
                roomId: roomId as UUID,
            };

            const result2 = await validate(runtime, message2);

            return result === true && result2 === false;
        });
    }, 60000);

    test("Test repetition check on continue", async () => {
        await runAiTest("Test repetition check on continue", async () => {
            const message: Memory = {
                userId: zeroUuid as UUID,
                content: {
                    text: "Hmm, let think for a second, I was going to tell you about something...",
                    action: "CONTINUE",
                },
                roomId,
            };

            const handler = action.handler!;

            await populateMemories(runtime, user, roomId, [
                GetContinueExample1,
            ]);

            const result = (await handler(runtime, message)) as Content;

            return result.action !== "CONTINUE";
        });
    }, 60000);

    test("Test multiple continue messages in a conversation", async () => {
        await runAiTest(
            "Test multiple continue messages in a conversation",
            async () => {
                const message: Memory = {
                    userId: user?.id as UUID,
                    content: {
                        text: "Write a short story in three parts, using the CONTINUE action for each part.",
                    },
                    roomId: roomId,
                };

                const initialMessageCount =
                    await runtime.messageManager.countMemories(roomId, false);

                await action.handler!(runtime, message);

                const finalMessageCount =
                    await runtime.messageManager.countMemories(roomId, false);

                const agentMessages = await runtime.messageManager.getMemories({
                    roomId,
                    agentId: runtime.agentId,
                    count: finalMessageCount - initialMessageCount,
                    unique: false,
                });

                const continueMessages = agentMessages.filter(
                    (m) =>
                        m.userId === zeroUuid &&
                        (m.content as Content).action === "CONTINUE"
                );

                // Check if the agent sent more than one message
                const sentMultipleMessages =
                    finalMessageCount - initialMessageCount > 2;

                // Check if the agent used the CONTINUE action for each part
                const usedContinueAction = continueMessages.length === 3;
                // Check if the agent's responses are not empty
                const responsesNotEmpty = agentMessages.every(
                    (m) => (m.content as Content).text !== ""
                );

                return (
                    sentMultipleMessages &&
                    usedContinueAction &&
                    responsesNotEmpty
                );
            }
        );
    }, 60000);

    test("Test if message is added to database", async () => {
        await runAiTest("Test if message is added to database", async () => {
            const message: Memory = {
                userId: user?.id as UUID,
                content: {
                    text: "Tell me more about your favorite food.",
                },
                roomId: roomId as UUID,
            };

            const initialMessageCount =
                await runtime.messageManager.countMemories(roomId, false);

            await action.handler!(runtime, message);

            const finalMessageCount =
                await runtime.messageManager.countMemories(roomId, false);

            return finalMessageCount - initialMessageCount === 2;
        });
    }, 60000);
    test("Test if not continue", async () => {
        await runAiTest("Test if not continue", async () => {
            // this is basically the same test as the one in ignore.test
            const message: Memory = {
                userId: user?.id as UUID,
                content: { text: "Bye" },
                roomId: roomId as UUID,
            };

            const handler = action.handler!;

            await populateMemories(runtime, user, roomId, [Goodbye1]);

            const result = (await handler(runtime, message)) as Content;

            return result.action === "IGNORE";
        });
    }, 60000);

    // test conditions where we would expect a wait or an ignore
});
