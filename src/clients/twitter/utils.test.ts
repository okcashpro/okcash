import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { SqliteDatabaseAdapter } from "../../adapters/sqlite.ts";
import defaultCharacter from "../../core/defaultCharacter.ts";
import { AgentRuntime } from "../../core/runtime.ts";
import settings from "../../core/settings.ts";
import { TwitterGenerationClient } from "./generate.ts";
import { buildConversationThread } from "./utils.ts";


const __dirname = path.dirname(new URL(".", import.meta.url).pathname);

describe("buildConversationThread", () => {
  let runtime: AgentRuntime;
  let client: TwitterGenerationClient;

  beforeAll(async () => {
    // Create an instance of the AgentRuntime
    runtime = new AgentRuntime({
      databaseAdapter: new SqliteDatabaseAdapter(new Database(":memory:")),
      token: settings.OPENAI_API_KEY as string,
      serverUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      evaluators: [],
      character: defaultCharacter,
      providers: [],
      actions: [],
    });

    // Create an instance of the TwitterGenerationClient
    client = new TwitterGenerationClient(runtime);

    // Load cached Twitter credentials
    const cookiesFilePath = path.join(__dirname, "./twitter/cookies.json");
    console.log("cookiesFilePath", cookiesFilePath);
    if (fs.existsSync(cookiesFilePath)) {
      const cookiesArray = JSON.parse(
        fs.readFileSync(cookiesFilePath, "utf-8"),
      );
      client.setCookiesFromArray(cookiesArray);
    } else {
      throw new Error("Twitter credentials not found. Please provide valid cookies.json.");
    }
  });

  it("should build a conversation thread from a tweet ID", async () => {
    const tweetId = "1826442010414518617";

    // Check if the tweet is already cached
    let tweet = await client.getCachedTweet(tweetId);

    // If the tweet is not cached, fetch it from the API and cache it
    if (!tweet) {
      tweet = await client.getTweet(tweetId);
      await client.cacheTweet(tweet);
    }

    // Build the conversation thread
    const thread = await buildConversationThread(tweet, client);

    console.log("Generated conversation thread:");
    console.log(thread);

    // Add assertions based on the expected structure and content of the thread
    expect(thread).toContain("[AcquiredWithin]: @BennisVirginia I'm not sure about it, in some ways I think we will lose some freedoms but maybe become freer.");
    expect(thread).toContain("[rubyresearch]: @AcquiredWithin @BennisVirginia freedom's just a fancy word for chaos anyway");
  });
});