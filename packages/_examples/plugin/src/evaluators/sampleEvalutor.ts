import { Evaluator, IAgentRuntime, Memory, State, okaiLogger } from "@okcashpro/okai";

export const sampleEvaluator: Evaluator = {
    alwaysRun: false,
    description: "Sample evaluator for checking important content in memory",
    similes: ["content checker", "memory evaluator"],
    examples: [
        {
            context: "Checking if memory contains important content",
            messages: [
                {
                    action: "evaluate",
                    input: "This is an important message",
                    output: {
                        score: 1,
                        reason: "Memory contains important content."
                    }
                }
            ],
            outcome: "Memory should be evaluated as important"
        }
    ],
    handler: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        // Evaluation logic for the evaluator
        okaiLogger.log("Evaluating data in sampleEvaluator...");

        // Example evaluation logic
        if (memory.content && memory.content.includes("important")) {
            okaiLogger.log("Important content found in memory.");
            return {
                score: 1,
                reason: "Memory contains important content."
            };
        } else {
            okaiLogger.log("No important content found in memory.");
            return {
                score: 0,
                reason: "Memory does not contain important content."
            };
        }
    },
    name: "sampleEvaluator",
    validate: async (runtime: IAgentRuntime, memory: Memory, state: State) => {
        // Validation logic for the evaluator
        return true;
    }
};
