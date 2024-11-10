import {
    Client,
    IAgentRuntime
} from "@ai16z/eliza/src/types.ts";


export class AutoClient {
    interval: NodeJS.Timeout;
    runtime: IAgentRuntime;

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        // start a loop that runs every x seconds
        this.interval = setInterval(() => {
            this.makeTrades();
        }, 60 * 60 * 1000); // 1 hour in milliseconds

    }

    makeTrades() {
        console.log("Running auto loop");

        // malibu todos
        // get high trust recommendations

        // get information for all tokens which were recommended
        // get any additional information we might need
        // make sure we're looking at the right tokens and data

        // shaw -- TODOs
        // compose thesis context
        // write a thesis which trades and why

        // compose trade context
        // geratate trades with LLM
        // parse trades from LLM
        // post thesis to twitter

        // malibu todos
        // execute trades
    }
}

export const AutoClientInterface: Client = {
    start: async (runtime: IAgentRuntime) => {
        const client = new AutoClient(runtime);
        return client;
    },
    stop: async (runtime: IAgentRuntime) => {
        console.warn("Direct client does not support stopping yet");
    },
};

export default AutoClientInterface;
