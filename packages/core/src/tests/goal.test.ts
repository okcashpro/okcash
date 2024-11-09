import dotenv from "dotenv";
import { defaultActions } from "../src/actions.ts";
import { createGoal, getGoals } from "../src/goals.ts";
import {
    Goal,
    GoalStatus,
    IAgentRuntime,
    Objective,
    State,
    type Memory,
    type UUID,
} from "../src/types.ts";
import { zeroUuid } from "../src/test_resources/constants.ts";
import { createRuntime } from "../src/test_resources/createRuntime.ts";
import { getOrCreateRelationship } from "../src/test_resources/getOrCreateRelationship.ts";
import { populateMemories } from "../src/test_resources/populateMemories.ts";
import { runAiTest } from "../src/test_resources/runAiTest.ts";
import { type User } from "../src/test_resources/types.ts";
import evaluator from "../src/evaluators/goal.ts";

dotenv.config({ path: ".dev.vars" });

describe("Goals Evaluator", () => {
    let user: User;
    let runtime: IAgentRuntime;
    let roomId: UUID;

    beforeAll(async () => {
        const setup = await createRuntime({
            env: process.env as Record<string, string>,
            evaluators: [evaluator],
            actions: defaultActions,
        });
        user = setup.session.user;
        runtime = setup.runtime;

        const data = await getOrCreateRelationship({
            runtime,
            userA: user.id as UUID,
            userB: zeroUuid,
        });

        if (!data) {
            throw new Error("Relationship not found");
        }

        roomId = data.roomId;

        await cleanup();
    });

    afterEach(async () => {
        await cleanup();
    });

    async function cleanup() {
        // delete all goals for the user
        await runtime.databaseAdapter.removeAllMemories(roomId, "goals");
    }

    async function createTestGoal(name: string, objectives: Objective[]) {
        const result = await createGoal({
            runtime,
            goal: {
                name,
                status: GoalStatus.IN_PROGRESS,
                roomId,
                userId: user.id as UUID,
                objectives,
            },
        });
        return result;
    }

    test("Update goal objectives based on conversation", async () => {
        await runAiTest(
            "Update goal objectives based on conversation",
            async () => {
                await cleanup();

                await createTestGoal("Test Goal", [
                    { description: "Complete task 1", completed: false },
                    { description: "Complete task 2", completed: false },
                ]);

                // Simulate a conversation indicating failure to achieve "Goal Y"
                const conversation = (userId: UUID) => [
                    {
                        userId,
                        content: {
                            text: "I see that you've finished the task?",
                        },
                    },
                    {
                        userId: zeroUuid,
                        content: {
                            text: "Yes, the task and all objectives are finished.",
                        },
                    },
                ];

                await populateMemories(runtime, user, roomId, [conversation]);

                // Simulate a conversation indicating the generateText of both objectives
                const message: Memory = {
                    userId: user.id as UUID,
                    content: {
                        text: "I've completed task 1 and task 2 for the Test Goal. Both are finished. Everything is done and I'm ready for the next goal.",
                    },
                    roomId,
                };

                // Process the message with the goal evaluator
                await evaluator.handler(
                    runtime,
                    message,
                    {} as unknown as State,
                    {
                        onlyInProgress: false,
                    }
                );

                // Fetch the updated goal to verify the objectives and status were updated
                const updatedGoals = await getGoals({
                    runtime,
                    roomId,
                    onlyInProgress: false,
                });

                const updatedTestGoal = updatedGoals.find(
                    (goal: Goal) => goal.name === "Test Goal"
                );

                return (
                    updatedTestGoal !== undefined &&
                    updatedTestGoal.status === GoalStatus.DONE &&
                    updatedTestGoal.objectives.every(
                        (obj: Objective) => obj.completed
                    )
                );
            }
        );
    }, 60000);

    test("Goal status updated to FAILED based on conversation", async () => {
        await runAiTest(
            "Goal status updated to FAILED based on conversation",
            async () => {
                await cleanup();
                // Preparing the test goal "Goal Y"
                await createTestGoal("Goal Y", [
                    {
                        description: "Complete all tasks for Goal Y",
                        completed: false,
                    },
                ]);

                // Simulate a conversation indicating failure to achieve "Goal Y"
                const conversation = (userId: UUID) => [
                    {
                        userId,
                        content: {
                            text: "I couldn't complete the tasks for Goal Y.",
                        },
                    },
                    {
                        userId: zeroUuid,
                        content: {
                            text: "That's unfortunate. Let's cancel it..",
                        },
                    },
                ];

                await populateMemories(runtime, user, roomId, [conversation]);

                const message: Memory = {
                    userId: user.id as UUID,
                    content: { text: "I've decided to mark Goal Y as failed." },
                    roomId,
                };

                await evaluator.handler(runtime, message, {} as State, {
                    onlyInProgress: false,
                });

                const goals = await getGoals({
                    runtime,
                    roomId,
                    onlyInProgress: false,
                });

                const goalY = goals.find(
                    (goal: Goal) => goal.name === "Goal Y"
                );

                return (
                    goalY !== undefined && goalY.status === GoalStatus.FAILED
                );
            }
        );
    }, 60000);
});
