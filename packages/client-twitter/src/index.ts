import { TwitterPostClient } from "./post.ts";
import { TwitterSearchClient } from "./search.ts";
import { TwitterInteractionClient } from "./interactions.ts";
import { IAgentRuntime, Client, okaiLogger } from "@okcashpro/okai";
import { validateTwitterConfig } from "./environment.ts";
import { ClientBase } from "./base.ts";

class TwitterManager {
    client: ClientBase;
    post: TwitterPostClient;
    search: TwitterSearchClient;
    interaction: TwitterInteractionClient;
    constructor(runtime: IAgentRuntime, enableSearch:boolean) {
        this.client = new ClientBase(runtime);
        this.post = new TwitterPostClient(this.client, runtime);

        if (enableSearch) {
          // this searches topics from character file
          okaiLogger.warn('Twitter/X client running in a mode that:')
          okaiLogger.warn('1. violates consent of random users')
          okaiLogger.warn('2. burns your rate limit')
          okaiLogger.warn('3. can get your account banned')
          okaiLogger.warn('use at your own risk')
          this.search = new TwitterSearchClient(this.client, runtime); // don't start the search client by default
        }
        this.interaction = new TwitterInteractionClient(this.client, runtime);
    }
}

export const TwitterClientInterface: Client = {

    async start(runtime: IAgentRuntime) {
        await validateTwitterConfig(runtime);

        okaiLogger.log("Twitter client started");

        // enableSearch is just set previous to this call
        // so enableSearch can change over time
        // and changing it won't stop the SearchClient in the existing instance
        const manager = new TwitterManager(runtime, this.enableSearch);

        await manager.client.init();

        await manager.post.start();

        await manager.interaction.start();

        //await manager.search.start(); // don't run the search by default

        return manager;
    },
    async stop(_runtime: IAgentRuntime) {
        okaiLogger.warn("Twitter client does not support stopping yet");
    },
};

export default TwitterClientInterface;
