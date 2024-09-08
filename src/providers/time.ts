import { IAgentRuntime, Memory, Provider, State } from "../core/types.ts";

const time: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    const currentTime = new Date().toLocaleTimeString("en-US");
    return "The current time is: " + currentTime;
  },
};

export default time;
