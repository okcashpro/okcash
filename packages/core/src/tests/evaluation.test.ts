import dotenv from "dotenv";
import fact from "../src/evaluators/fact.ts";
import { zeroUuid } from "../src/test_resources/constants.ts";
import { createRuntime } from "../src/test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../src/test_resources/getOrCreateRelationship.ts";
import { runAiTest } from "../src/test_resources/runAiTest.ts";
import {
    TEST_EVALUATOR,
    TEST_EVALUATOR_FAIL,
} from "../src/test_resources/testEvaluator.ts";
import { type User } from "../src/test_resources/types.ts";
import { composeContext } from "../src/context.ts";
import { evaluationTemplate } from "../src/evaluators.ts";
import { IAgentRuntime, Memory, UUID } from "../src/types.ts";

dotenv.config({ path: ".dev.vars" });

describe("Evaluation Process", () => {
    let runtime: IAgentRuntime;
    let user: User;
    let roomId: UUID;

    beforeAll(async () => {
        const setup = await createRuntime({
            env: process.env as Record<string, string>,
            evaluators: [TEST_EVALUATOR, TEST_EVALUATOR_FAIL],
        });
        runtime = setup.runtime;
        user = setup.session.user;

        const data = await getOrCreateRelationship({
            runtime,
            userA: user.id as UUID,
            userB: zeroUuid,
        });

        if (!data) {
            throw new Error("Relationship not found");
        }

        roomId = data!.roomId;
    });

    test("Validate the format of the examples from the evaluator", () => {
        expect(TEST_EVALUATOR.examples).toBeInstanceOf(Array);
        TEST_EVALUATOR.examples.forEach((example) => {
            expect(example).toHaveProperty("context");
            expect(example).toHaveProperty("messages");
            expect(example.messages).toBeInstanceOf(Array);
            example.messages.forEach((message) => {
                expect(message).toHaveProperty("user");
                expect(message).toHaveProperty("content");
                expect(message.content).toHaveProperty("action");
            });
            expect(example).toHaveProperty("outcome");
        });
    });

    test("Check if test and examples appear in state", async () => {
        const message: Memory = {
            userId: user.id as UUID,
            content: { text: "Test message for evaluation" },
            roomId,
        };

        const state = await runtime.composeState(message);
        const prompt = composeContext({ state, template: evaluationTemplate });

        // expect that the prompt contacts the testEvaluator name
        expect(prompt).toContain(TEST_EVALUATOR.name);

        // check if state.EvaluatorNames contains the testEvaluator name

        expect(state.evaluatorNames).toContain(TEST_EVALUATOR.name);
    });

    test("Run the TEST_EVALUATOR handler and validate output", async () => {
        const message: Memory = {
            userId: user.id as UUID,
            content: { text: "Run TEST_EVALUATOR handler" },
            roomId,
        };

        const result = await TEST_EVALUATOR.handler(runtime, message);
        expect(result).toBeTruthy();
    });

    test("Run the evaluation process", async () => {
        await runAiTest("Run the evaluation process", async () => {
            const message: Memory = {
                userId: user.id as UUID,
                content: {
                    text: "We are in testing mode. We want to make sure that the test passes by replying with the evaluator TEST_EVALUATOR in the array of evaluators that are returned. Please run the TEST_EVALUATOR",
                },
                roomId,
            };

            const state = await runtime.composeState(message);
            const result = await runtime.evaluate(message, state);

            return result?.includes("TEST_EVALUATOR");
        }); // Adjust the timeout if needed
    }, 600000);

    test("Test that fact appears in evaluation handler", async () => {
        const { runtime } = await createRuntime({
            env: process.env as Record<string, string>,
            conversationLength: 1,
            evaluators: [fact],
        });

        const message: Memory = {
            userId: user.id as UUID,
            content: { text: "Test message for evaluation" },
            roomId,
        };

        const state = await runtime.composeState(message);
        const prompt = composeContext({ state, template: evaluationTemplate });

        // expect that the prompt contacts the testEvaluator name
        expect(prompt.includes(fact.name)).toBeTruthy();

        // check if state.EvaluatorNames contains the testEvaluator name

        expect(state.evaluatorNames).toContain(fact.name);
    });
});
