import dotenv from "dotenv";
import { createRuntime } from "../../test_resources/createRuntime.ts";
import { AgentRuntime } from "../runtime.ts";
import {
  type Message,
  type Provider,
  type State,
  type UUID,
} from "../types.ts";
import { zeroUuid } from "../constants.ts";

dotenv.config({ path: ".dev.vars" });

const TestProvider: Provider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get: async (_runtime: AgentRuntime, _message: Message, _state?: State) => {
    return "Hello Test";
  },
};

describe("TestProvider", () => {
  let runtime: AgentRuntime;
  let room_id: UUID;

  beforeAll(async () => {
    const setup = await createRuntime({
      env: process.env as Record<string, string>,
      providers: [TestProvider],
    });
    runtime = setup.runtime;
    room_id = zeroUuid;
  });

  test("TestProvider should return 'Hello Test'", async () => {
    const message: Message = {
      user_id: zeroUuid,
      content: { text: "" },
      room_id: room_id,
    };

    const testProviderResponse = await TestProvider.get(
      runtime,
      message,
      {} as State,
    );
    expect(testProviderResponse).toBe("Hello Test");
  });

  test("TestProvider should be integrated in the runtime providers", async () => {
    expect(runtime.providers).toContain(TestProvider);
  });
});
