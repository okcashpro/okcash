import { composeContext } from "@okcashpro/okai";
import { generateText } from "@okcashpro/okai";
import { getGoals } from "@okcashpro/okai";
import { parseJsonArrayFromText } from "@okcashpro/okai";
import {
    IAgentRuntime,
    Memory,
    ModelClass,
    Objective,
    type Goal,
    type State,
    Evaluator,
} from "@okcashpro/okai";

const goalsTemplate = `TASK: Update Goal
Analyze the conversation and update the status of the goals based on the new information provided.

# INSTRUCTIONS

- Review the conversation and identify any progress towards the objectives of the current goals.
- Update the objectives if they have been completed or if there is new information about them.
- Update the status of the goal to 'DONE' if all objectives are completed.
- If no progress is made, do not change the status of the goal.

# START OF ACTUAL TASK INFORMATION

{{goals}}
{{recentMessages}}

TASK: Analyze the conversation and update the status of the goals based on the new information provided. Respond with a JSON array of goals to update.
- Each item must include the goal ID, as well as the fields in the goal to update.
- For updating objectives, include the entire objectives array including unchanged fields.
- Only include goals which need to be updated.
- Goal status options are 'IN_PROGRESS', 'DONE' and 'FAILED'. If the goal is active it should always be 'IN_PROGRESS'.
- If the goal has been successfully completed, set status to DONE. If the goal cannot be completed, set status to FAILED.
- If those goal is still in progress, do not include the status field.

Response format should be:
\`\`\`json
[
  {
    "id": <goal uuid>, // required
    "status": "IN_PROGRESS" | "DONE" | "FAILED", // optional
    "objectives": [ // optional
      { "description": "Objective description", "completed": true | false },
      { "description": "Objective description", "completed": true | false }
    ] // NOTE: If updating objectives, include the entire objectives array including unchanged fields.
  }
]
\`\`\``;

async function handler(
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: { [key: string]: unknown } = { onlyInProgress: true }
): Promise<Goal[]> {
    // get goals
    let goalsData = await getGoals({
        runtime,
        roomId: message.roomId,
        onlyInProgress: options.onlyInProgress as boolean,
    });

    state = (await runtime.composeState(message)) as State;
    const context = composeContext({
        state,
        template: runtime.character.templates?.goalsTemplate || goalsTemplate,
    });

    // Request generateText from OpenAI to analyze conversation and suggest goal updates
    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    // Parse the JSON response to extract goal updates
    const updates = parseJsonArrayFromText(response);

    // get goals
    goalsData = await getGoals({
        runtime,
        roomId: message.roomId,
        onlyInProgress: true,
    });

    // Apply the updates to the goals
    const updatedGoals = goalsData
        .map((goal: Goal) => {
            const update = updates?.find((u) => u.id === goal.id);
            if (update) {
                const objectives = goal.objectives;

                // for each objective in update.objectives, find the objective with the same description in 'objectives' and set the 'completed' value to the update.objectives value
                if (update.objectives) {
                    for (const objective of objectives) {
                        const updatedObjective = update.objectives.find(
                            (o: Objective) =>
                                o.description === objective.description
                        );
                        if (updatedObjective) {
                            objective.completed = updatedObjective.completed;
                        }
                    }
                }

                return {
                    ...goal,
                    ...update,
                    objectives: [
                        ...goal.objectives,
                        ...(update?.objectives || []),
                    ],
                }; // Merging the update into the existing goal
            } else {
                console.warn("**** ID NOT FOUND");
            }
            return null; // No update for this goal
        })
        .filter(Boolean);

    // Update goals in the database
    for (const goal of updatedGoals) {
        const id = goal.id;
        // delete id from goal
        if (goal.id) delete goal.id;
        await runtime.databaseAdapter.updateGoal({ ...goal, id });
    }

    return updatedGoals; // Return updated goals for further processing or logging
}

export const goalEvaluator: Evaluator = {
    name: "UPDATE_GOAL",
    similes: [
        "UPDATE_GOALS",
        "EDIT_GOAL",
        "UPDATE_GOAL_STATUS",
        "UPDATE_OBJECTIVES",
    ],
    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        // Check if there are active goals that could potentially be updated
        const goals = await getGoals({
            runtime,
            count: 1,
            onlyInProgress: true,
            roomId: message.roomId,
        });
        return goals.length > 0;
    },
    description:
        "Analyze the conversation and update the status of the goals based on the new information provided.",
    handler,
    examples: [
        {
            context: `Actors in the scene:
  {{user1}}: An avid reader and member of a book club.
  {{user2}}: The organizer of the book club.

  Goals:
  - Name: Finish reading "War and Peace"
    id: 12345-67890-12345-67890
    Status: IN_PROGRESS
    Objectives:
      - Read up to chapter 20 by the end of the month
      - Discuss the first part in the next meeting`,

            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I've just finished chapter 20 of 'War and Peace'",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Were you able to grasp the complexities of the characters",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "Yep. I've prepared some notes for our discussion",
                    },
                },
            ],

            outcome: `[
        {
          "id": "12345-67890-12345-67890",
          "status": "DONE",
          "objectives": [
            { "description": "Read up to chapter 20 by the end of the month", "completed": true },
            { "description": "Prepare notes for the next discussion", "completed": true }
          ]
        }
      ]`,
        },

        {
            context: `Actors in the scene:
  {{user1}}: A fitness enthusiast working towards a marathon.
  {{user2}}: A personal trainer.

  Goals:
  - Name: Complete a marathon
    id: 23456-78901-23456-78901
    Status: IN_PROGRESS
    Objectives:
      - Increase running distance to 30 miles a week
      - Complete a half-marathon as practice`,

            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "I managed to run 30 miles this week" },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Impressive progress! How do you feel about the half-marathon next month?",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "I feel confident. The training is paying off.",
                    },
                },
            ],

            outcome: `[
        {
          "id": "23456-78901-23456-78901",
          "objectives": [
            { "description": "Increase running distance to 30 miles a week", "completed": true },
            { "description": "Complete a half-marathon as practice", "completed": false }
          ]
        }
      ]`,
        },

        {
            context: `Actors in the scene:
  {{user1}}: A student working on a final year project.
  {{user2}}: The project supervisor.

  Goals:
  - Name: Finish the final year project
    id: 34567-89012-34567-89012
    Status: IN_PROGRESS
    Objectives:
      - Submit the first draft of the thesis
      - Complete the project prototype`,

            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I've submitted the first draft of my thesis.",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Well done. How is the prototype coming along?",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "It's almost done. I just need to finalize the testing phase.",
                    },
                },
            ],

            outcome: `[
        {
          "id": "34567-89012-34567-89012",
          "objectives": [
            { "description": "Submit the first draft of the thesis", "completed": true },
            { "description": "Complete the project prototype", "completed": false }
          ]
        }
      ]`,
        },

        {
            context: `Actors in the scene:
        {{user1}}: A project manager working on a software development project.
        {{user2}}: A software developer in the project team.

        Goals:
        - Name: Launch the new software version
          id: 45678-90123-45678-90123
          Status: IN_PROGRESS
          Objectives:
            - Complete the coding for the new features
            - Perform comprehensive testing of the software`,

            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "How's the progress on the new features?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "We've encountered some unexpected challenges and are currently troubleshooting.",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "Let's move on and cancel the task.",
                    },
                },
            ],

            outcome: `[
        {
          "id": "45678-90123-45678-90123",
          "status": "FAILED"
      ]`,
        },
    ],
};
