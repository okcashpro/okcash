import { type BgentRuntime, type Message, type Provider, type State } from "bgent";

const time: Provider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get: async (_runtime: BgentRuntime, _message: Message, _state?: State) => {
    const currentTime = new Date().toLocaleTimeString("en-US");
    return "The current time is: " + currentTime;
  },
};

export default time;
