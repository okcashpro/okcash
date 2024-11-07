import { TwitterPostClient } from "./post.ts";
import { TwitterSearchClient } from "./search.ts";
import { TwitterInteractionClient } from "./interactions.ts";
import { IAgentRuntime, Client } from "@ai16z/eliza/core/types.ts";
        
class TwitterAllClient {
    post: TwitterPostClient;
    search: TwitterSearchClient;
    interaction: TwitterInteractionClient;
    constructor(runtime: IAgentRuntime) {
        this.post = new TwitterPostClient(runtime);
        this.search = new TwitterSearchClient(runtime);
        this.interaction = new TwitterInteractionClient(runtime);
    }
}

const TwitterClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        return new TwitterAllClient(runtime);
    },
    async stop(runtime: IAgentRuntime) {
        console.warn("Twitter client does not support stopping yet");
    }
}

export default TwitterClientInterface;