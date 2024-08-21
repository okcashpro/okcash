import { AgentRuntime } from "../runtime.ts"
import { Message, Provider, State } from "../types.ts"

const time: Provider = {
  get: async (_runtime: AgentRuntime, _message: Message, _state?: State) => {
    const currentTime = new Date().toLocaleTimeString("en-US");
    return "The current time is: " + currentTime;
  },
};

export default time;
