import dotenv from "dotenv";
import { composeContext } from "../src/context.ts";
import {
    IAgentRuntime,
    type Memory,
    type State,
    type UUID,
} from "../src/types.ts";
import { zeroUuid } from "../src/test_resources/constants.ts";
import { createRuntime } from "../src/test_resources/createRuntime.ts";
import timeProvider from "../src/providers/time.ts";

dotenv.config({ path: ".dev.vars" });

describe("Time Provider", () => {
    let runtime: IAgentRuntime;
    let user: { id: UUID };
    let roomId: UUID;

    beforeAll(async () => {
        const setup = await createRuntime({
            env: process.env as Record<string, string>,
            providers: [timeProvider],
        });
        runtime = setup.runtime;
        user = { id: setup.session.user?.id as UUID };
        roomId = zeroUuid;
    });

    test("Time provider should return the current time in the correct format", async () => {
        const message: Memory = {
            userId: user.id,
            content: { text: "" },
            roomId: roomId,
        };

        const currentTimeResponse = await timeProvider.get(
            runtime,
            message,
            {} as State
        );
        expect(currentTimeResponse).toMatch(
            /^The current time is: \d{1,2}:\d{2}:\d{2}\s?(AM|PM)$/
        );
    });

    test("Time provider should be integrated in the state and context correctly", async () => {
        const message: Memory = {
            userId: user.id,
            content: { text: "" },
            roomId: roomId,
        };

        // Manually integrate the time provider's response into the state
        const state = await runtime.composeState(message);

        const contextTemplate = `Current Time: {{providers}}`;
        const context = composeContext({
            state: state,
            template: contextTemplate,
        });

        const match = context.match(
            new RegExp(
                `^Current Time: The current time is: \\d{1,2}:\\d{2}:\\d{2}\\s?(AM|PM)$`
            )
        );

        expect(match).toBeTruthy();
    });

    test("Time provider should work independently", async () => {
        const message: Memory = {
            userId: user.id,
            content: { text: "" },
            roomId: roomId,
        };
        const currentTimeResponse = await timeProvider.get(runtime, message);

        expect(currentTimeResponse).toMatch(
            /^The current time is: \d{1,2}:\d{2}:\d{2}\s?(AM|PM)$/
        );
    });
});
