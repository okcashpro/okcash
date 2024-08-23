import { AgentRuntime } from "../core/runtime.ts";
import { Message, Provider, State } from "../core/types.ts";

const time: Provider = {
  get: async (_runtime: AgentRuntime, _message: Message, _state?: State) => {
    const currentTime = new Date().toLocaleTimeString("en-US");
    return "The current time is: " + currentTime;
  },
};

export default time;
