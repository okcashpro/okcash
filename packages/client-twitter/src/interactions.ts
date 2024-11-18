import { SearchMode, Tweet } from "agent-twitter-client";
import fs from "fs";
import { composeContext } from "@ai16z/eliza";
import { generateMessageResponse, generateShouldRespond } from "@ai16z/eliza";
import { messageCompletionFooter, shouldRespondFooter } from "@ai16z/eliza";
import {
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@ai16z/eliza";
import { stringToUuid } from "@ai16z/eliza";
import { ClientBase } from "./base.ts";
import { buildConversationThread, sendTweet, wait } from "./utils.ts";
import { embeddingZeroVector } from "@ai16z/eliza/src/memory.ts";

export const twitterMessageHandlerTemplate =
    `{{timeline}}

# Knowledge
{{knowledge}}

# Task: Generate a post for the character {{agentName}}.
About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}


# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}
Thread of Tweets You Are Replying To:

{{formattedConversation}}

{{actions}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}). Include an action, if appropriate. {{actionNames}}:
{{currentPost}}
` + messageCompletionFooter;

export const twitterShouldRespondTemplate =
    `# INSTRUCTIONS: Determine if {{agentName}} (@{{twitterUserName}}) should respond to the message and participate in the conversation. Do not comment. Just respond with "true" or "false".

Response options are RESPOND, IGNORE and STOP .

{{agentName}} should respond to messages that are directed at them, or participate in conversations that are interesting or relevant to their background, IGNORE messages that are irrelevant to them, and should STOP if the conversation is concluded.

{{agentName}} is in a room with other users and wants to be conversational, but not annoying.
{{agentName}} should RESPOND to messages that are directed at them, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, {{agentName}} should IGNORE.
Unless directly RESPONDing to a user, {{agentName}} should IGNORE messages that are very short or do not contain much information.
If a user asks {{agentName}} to stop talking, {{agentName}} should STOP.
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, {{agentName}} should STOP.

{{recentPosts}}

IMPORTANT: {{agentName}} (aka @{{twitterUserName}}) is particularly sensitive about being annoying, so if there is any doubt, it is better to IGNORE than to RESPOND.

{{currentPost}}

Thread of Tweets You Are Replying To:

{{formattedConversation}}

# INSTRUCTIONS: Respond with [RESPOND] if {{agentName}} should respond, or [IGNORE] if {{agentName}} should not respond to the last message and [STOP] if {{agentName}} should stop participating in the conversation.
` + shouldRespondFooter;

export class TwitterInteractionClient extends ClientBase {
    onReady() {
        const handleTwitterInteractionsLoop = () => {
            this.handleTwitterInteractions();
            setTimeout(
                handleTwitterInteractionsLoop,
                (Math.floor(Math.random() * (5 - 2 + 1)) + 2) * 60 * 1000
            ); // Random interval between 2-5 minutes
        };
        handleTwitterInteractionsLoop();
    }

    constructor(runtime: IAgentRuntime) {
        super({
            runtime,
        });
    }

    async handleTwitterInteractions() {
        console.log("Checking Twitter interactions");
        try {
            // Check for mentions
            const tweetCandidates = (
                await this.fetchSearchTweets(
                    `@${this.runtime.getSetting("TWITTER_USERNAME")}`,
                    20,
                    SearchMode.Latest
                )
            ).tweets;

            // de-duplicate tweetCandidates with a set
            const uniqueTweetCandidates = [...new Set(tweetCandidates)];

            // Sort tweet candidates by ID in ascending order
            uniqueTweetCandidates
                .sort((a, b) => a.id.localeCompare(b.id))
                .filter((tweet) => tweet.userId !== this.twitterUserId);

            // for each tweet candidate, handle the tweet
            for (const tweet of uniqueTweetCandidates) {
                // console.log("tweet:", tweet);
                if (
                    !this.lastCheckedTweetId ||
                    parseInt(tweet.id) > this.lastCheckedTweetId
                ) {
                    const conversationId =
                        tweet.conversationId + "-" + this.runtime.agentId;

                    const roomId = stringToUuid(conversationId);

                    const userIdUUID = stringToUuid(tweet.userId as string);

                    await this.runtime.ensureConnection(
                        userIdUUID,
                        roomId,
                        tweet.username,
                        tweet.name,
                        "twitter"
                    );
                    
     
                    const thread = await buildConversationThread(tweet, this);
                    console.log("thread", thread);

                    const message = {
                        content: { text: tweet.text },
                        agentId: this.runtime.agentId,
                        userId: userIdUUID,
                        roomId,
                    };

                    await this.handleTweet({
                        tweet,
                        message,
                        thread,
                    });

                    // Update the last checked tweet ID after processing each tweet
                    this.lastCheckedTweetId = parseInt(tweet.id);

                    try {
                        if (this.lastCheckedTweetId) {

                            fs.writeFileSync(
                                this.tweetCacheFilePath,
                                this.lastCheckedTweetId.toString(),
                                "utf-8"
                            );
                        }
                    } catch (error) {
                        console.error(
                            "Error saving latest checked tweet ID to file:",
                            error
                        );
                    }
                }
            }

            // Save the latest checked tweet ID to the file
            try {
                if (this.lastCheckedTweetId) {
                    fs.writeFileSync(
                        this.tweetCacheFilePath,
                        this.lastCheckedTweetId.toString(),
                        "utf-8"
                    );
                }
            } catch (error) {
                console.error(
                    "Error saving latest checked tweet ID to file:",
                    error
                );
            }

            console.log("Finished checking Twitter interactions");
        } catch (error) {
            console.error("Error handling Twitter interactions:", error);
        }
    }

    private async handleTweet({
        tweet,
        message,
        thread
    }: {
        tweet: Tweet;
        message: Memory;
        thread: Tweet[];
    }) {
        if (tweet.username === this.runtime.getSetting("TWITTER_USERNAME")) {
            // console.log("skipping tweet from bot itself", tweet.id);
            // Skip processing if the tweet is from the bot itself
            return;
        }

        if (!message.content.text) {
            console.log("skipping tweet with no text", tweet.id);
            return { text: "", action: "IGNORE" };
        }
        console.log("handling tweet", tweet.id);
        const formatTweet = (tweet: Tweet) => {
            return `  ID: ${tweet.id}
  From: ${tweet.name} (@${tweet.username})
  Text: ${tweet.text}`;
        };
        const currentPost = formatTweet(tweet);

        let homeTimeline = [];
        // read the file if it exists
        if (fs.existsSync("tweetcache/home_timeline.json")) {
            homeTimeline = JSON.parse(
                fs.readFileSync("tweetcache/home_timeline.json", "utf-8")
            );
        } else {
            homeTimeline = await this.fetchHomeTimeline(50);
            fs.writeFileSync(
                "tweetcache/home_timeline.json",
                JSON.stringify(homeTimeline, null, 2)
            );
        }

        console.log("Thread: ", thread);
        const formattedConversation = thread
            .map(tweet => `@${tweet.username} (${new Date(tweet.timestamp * 1000).toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                month: 'short',
                day: 'numeric'
            })}):
        ${tweet.text}`)
            .join('\n\n');
        
        console.log("formattedConversation: ", formattedConversation);
        

        const formattedHomeTimeline =
            `# ${this.runtime.character.name}'s Home Timeline\n\n` +
            homeTimeline
                .map((tweet) => {
                    return `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}\nText: ${tweet.text}\n---\n`;
                })
                .join("\n");

        let state = await this.runtime.composeState(message, {
            twitterClient: this.twitterClient,
            twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
            currentPost,
            formattedConversation,
            timeline: formattedHomeTimeline,
        });

        // check if the tweet exists, save if it doesn't
        const tweetId = stringToUuid(tweet.id + "-" + this.runtime.agentId);
        const tweetExists =
            await this.runtime.messageManager.getMemoryById(tweetId);

        if (!tweetExists) {
            console.log("tweet does not exist, saving");
            const userIdUUID = stringToUuid(tweet.userId as string);
            const roomId = stringToUuid(tweet.conversationId);

            const message = {
                id: tweetId,
                agentId: this.runtime.agentId,
                content: {
                    text: tweet.text,
                    url: tweet.permanentUrl,
                    inReplyTo: tweet.inReplyToStatusId
                        ? stringToUuid(
                            tweet.inReplyToStatusId +
                            "-" +
                            this.runtime.agentId
                        )
                        : undefined,
                },
                userId: userIdUUID,
                roomId,
                createdAt: tweet.timestamp * 1000,
            };
            this.saveRequestMessage(message, state);
        }

        console.log("composeState done");

        const shouldRespondContext = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.twitterShouldRespondTemplate ||
                this.runtime.character?.templates?.shouldRespondTemplate ||
                twitterShouldRespondTemplate,
        });

        console.log("composeContext done");

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.LARGE,
        });

        // Promise<"RESPOND" | "IGNORE" | "STOP" | null> {
        if (shouldRespond !== "RESPOND") {
            console.log("Not responding to message");
            return { text: "Response Decision:", action: shouldRespond };
        }

        const context = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.twitterMessageHandlerTemplate ||
                this.runtime.character?.templates?.messageHandlerTemplate ||
                twitterMessageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });

        const removeQuotes = (str: string) => str.replace(/^['"](.*)['"]$/, '$1');
        
        const stringId = stringToUuid(tweet.id + "-" + this.runtime.agentId);

        response.inReplyTo = stringId;

        response.text = removeQuotes(response.text);

        if (response.text) {
            try {
                const callback: HandlerCallback = async (response: Content) => {
                    const memories = await sendTweet(
                        this,
                        response,
                        message.roomId,
                        this.runtime.getSetting("TWITTER_USERNAME"),
                        tweet.id
                    );
                    return memories;
                };

                const responseMessages = await callback(response);

                state = (await this.runtime.updateRecentMessageState(
                    state
                )) as State;

                for (const responseMessage of responseMessages) {
                    if (
                        responseMessage ===
                        responseMessages[responseMessages.length - 1]
                    ) {
                        responseMessage.content.action = response.action;
                    } else {
                        responseMessage.content.action = "CONTINUE";
                    }
                    await this.runtime.messageManager.createMemory(
                        responseMessage
                    );
                }

                await this.runtime.evaluate(message, state);

                await this.runtime.processActions(
                    message,
                    responseMessages,
                    state
                );
                const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;
                // f tweets folder dont exist, create
                if (!fs.existsSync("tweets")) {
                    fs.mkdirSync("tweets");
                }
                const debugFileName = `tweets/tweet_generation_${tweet.id}.txt`;
                fs.writeFileSync(debugFileName, responseInfo);
                await wait();
            } catch (error) {
                console.error(`Error sending response tweet: ${error}`);
            }
        }
    }


    async buildConversationThread(
        tweet: Tweet,
        maxReplies: number = 10
    ): Promise<Tweet[]> {
        const thread: Tweet[] = [];
        const visited: Set<string> = new Set();

        async function processThread(
            currentTweet: Tweet, 
            depth: number = 0
        ) {
            console.log("Processing tweet:", {
                id: currentTweet.id,
                inReplyToStatusId: currentTweet.inReplyToStatusId,
                depth: depth
            });

            if (!currentTweet) {
                console.log("No current tweet found for thread building");
                return;
            }

            if (depth >= maxReplies) {
                console.log("Reached maximum reply depth", depth);
                return;
            }

            // Handle memory storage
            const memory = await this.runtime.messageManager.getMemoryById(
                stringToUuid(currentTweet.id + "-" + this.runtime.agentId)
            );
            if (!memory) {
                const roomId = stringToUuid(
                    currentTweet.conversationId + "-" + this.runtime.agentId
                );
                const userId = stringToUuid(currentTweet.userId);

                await this.runtime.ensureConnection(
                    userId,
                    roomId,
                    currentTweet.username,
                    currentTweet.name,
                    "twitter"
                );

                this.runtime.messageManager.createMemory({
                    id: stringToUuid(
                        currentTweet.id + "-" + this.runtime.agentId
                    ),
                    agentId: this.runtime.agentId,
                    content: {
                        text: currentTweet.text,
                        source: "twitter",
                        url: currentTweet.permanentUrl,
                        inReplyTo: currentTweet.inReplyToStatusId
                            ? stringToUuid(
                                  currentTweet.inReplyToStatusId +
                                      "-" +
                                      this.runtime.agentId
                              )
                            : undefined,
                    },
                    createdAt: currentTweet.timestamp * 1000,
                    roomId,
                    userId:
                        currentTweet.userId === this.twitterUserId
                            ? this.runtime.agentId
                            : stringToUuid(currentTweet.userId),
                    embedding: embeddingZeroVector,
                });
            }

            if (visited.has(currentTweet.id)) {
                console.log("Already visited tweet:", currentTweet.id);
                return;
            }

            visited.add(currentTweet.id);
            thread.unshift(currentTweet);
                
            console.log("Current thread state:", {
                length: thread.length,
                currentDepth: depth,
                tweetId: currentTweet.id
            });

            if (currentTweet.inReplyToStatusId) {
                console.log("Fetching parent tweet:", currentTweet.inReplyToStatusId);
                try {
                    const parentTweet = await this.twitterClient.getTweet(
                        currentTweet.inReplyToStatusId
                    );

                    if (parentTweet) {
                        console.log("Found parent tweet:", {
                            id: parentTweet.id,
                            text: parentTweet.text?.slice(0, 50)
                        });
                        await processThread(parentTweet, depth + 1);
                    } else {
                        console.log("No parent tweet found for:", currentTweet.inReplyToStatusId);
                    }
                } catch (error) {
                    console.log("Error fetching parent tweet:", {
                        tweetId: currentTweet.inReplyToStatusId,
                        error
                    });
                }
            } else {
                console.log("Reached end of reply chain at:", currentTweet.id);
            }
        }

        // Need to bind this context for the inner function
        await processThread.bind(this)(tweet, 0);
        
        console.log("Final thread built:", {
            totalTweets: thread.length,
            tweetIds: thread.map(t => ({
                id: t.id,
                text: t.text?.slice(0, 50)
            }))
        });

        return thread;
    }
}