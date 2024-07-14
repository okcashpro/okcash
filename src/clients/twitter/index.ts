import { Scraper, SearchMode, Tweet } from "agent-twitter-client";
import {
  Content,
  Message,
  State,
  composeContext,
  embeddingZeroVector,
  parseJSONObjectFromText
} from "bgent";
import { UUID } from "crypto";
import { EventEmitter } from "events";
import fs from "fs";
import path from 'path';
import { default as getUuid } from "uuid-by-string";
import { Agent } from "../../core/agent.ts";
import { adapter } from "../../core/db.ts";
import settings from "../../core/settings.ts";

import { fileURLToPath } from 'url';
import { isRelevantPrompt, newTweetPrompt, searchTermsTemplate, messageHandlerTemplate, shouldRespondTemplate, topics } from "./prompts.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TwitterClient extends EventEmitter {
  private twitterClient: Scraper;
  private agent: Agent;
  private bio: string;
  private lastCheckedTweetId: string | null = null;
  private temperature: number;

  constructor(agent: Agent, bio: string) {
    super()
    this.agent = agent;
    this.twitterClient = new Scraper();
    this.bio = bio;
    this.temperature = 0.9;

    // Check for Twitter cookies
    if (settings.TWITTER_COOKIES) {
      console.log("settings.TWITTER_COOKIES")
      console.log(settings.TWITTER_COOKIES)
      const cookiesArray = JSON.parse(settings.TWITTER_COOKIES);
      this.setCookiesFromArray(cookiesArray);
    } else {
      const cookiesFilePath = path.join(__dirname, 'cookies.json');
      if (fs.existsSync(cookiesFilePath)) {
        const cookiesArray = JSON.parse(fs.readFileSync(cookiesFilePath, 'utf-8'));
        console.log("cookies")
        console.log(cookiesArray)
        this.setCookiesFromArray(cookiesArray);
      } else {
        console.log("settings.TWITTER_USERNAME")
        console.log(settings.TWITTER_USERNAME)
        this.twitterClient.login(settings.TWITTER_USERNAME, settings.TWITTER_PASSWORD, settings.TWITTER_EMAIL)
          .then(() => {
            console.log('Logged in to Twitter')
            return this.twitterClient.getCookies();
          })
          .then((cookies) => {
            console.log("cookies")
            console.log(cookies)
            fs.writeFileSync(cookiesFilePath, JSON.stringify(cookies), 'utf-8');
          })
          .catch((error) => {
            console.error('Error logging in to Twitter:', error);
          });
      }

    }

    console.log("doing stuff");

    (async () => {
      while (!(await this.twitterClient.isLoggedIn())) {
        console.log('Waiting for Twitter login');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // now loop every minute
      this.startTwitterLoop();
    })()
  }

  private setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(cookie =>
      `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? 'Secure' : ''}; ${cookie.httpOnly ? 'HttpOnly' : ''}; SameSite=${cookie.sameSite || 'Lax'}`
    );
    this.twitterClient.setCookies(cookieStrings);
  }


  private async handleTwitterInteractions() {
    console.log('Checking Twitter interactions');
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error('Twitter username not set in settings');
        return;
      }

      // Check for mentions
      const mentions = this.twitterClient.searchTweets(`@${botTwitterUsername}`, 20, SearchMode.Latest);
      for await (const tweet of mentions) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId) break;
        await this.handleTweet(tweet);
      }

      // Check for replies to the bot's tweets
      const botTweets = this.twitterClient.getTweets(botTwitterUsername, 20);
      for await (const tweet of botTweets) {
        if (this.lastCheckedTweetId && tweet.id <= this.lastCheckedTweetId) break;
        const replies = this.twitterClient.searchTweets(`to:${botTwitterUsername}`, 20, SearchMode.Latest);
        for await (const reply of replies) {
          if (reply.inReplyToStatusId === tweet.id) {
            await this.handleTweet(reply);
          }
        }
      }

      // Update the last checked tweet ID
      const latestTweet = await this.twitterClient.getLatestTweet(botTwitterUsername);
      if (latestTweet) {
        this.lastCheckedTweetId = latestTweet.id;
      }
      console.log('Finished checking Twitter interactions, latest tweet is:', latestTweet);
    } catch (error) {
      console.error('Error handling Twitter interactions:', error);
    }
  }

  private async handleTweet(tweet: Tweet) {
    const botTwitterUsername = settings.TWITTER_USERNAME;
    if (tweet.username === botTwitterUsername) {
      // Skip processing if the tweet is from the bot itself
      return;
    }
    const twitterUserId = getUuid(tweet.userId as string) as UUID;
    const twitterRoomId = getUuid('twitter') as UUID;

    await this.agent.ensureUserExists(twitterUserId, tweet.username);

    await this.agent.ensureRoomExists(twitterRoomId);
    await this.agent.ensureParticipantInRoom(twitterUserId, twitterRoomId);

    const message: Message = {
      content: { content: tweet.text, action: "WAIT" },
      user_id: twitterUserId,
      room_id: twitterRoomId,
    };

    let shouldIgnore = false
    let shouldRespond = true

    if (!message.content.content) {
      return { content: "", action: "IGNORE" };
    }
    let state = await this.agent.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterMessage: message,
    });

    await this.saveRequestMessage(message, state as State);

    if (shouldIgnore) {
      console.log("shouldIgnore", shouldIgnore);
      return { content: "", action: "IGNORE" };
    }

    const nickname = settings.TWITTER_USERNAME;

    state = await this.agent.runtime.composeState(message, {
      twitterClient: this.twitterClient,
      twitterMessage: message,
      agentName: nickname || "Ruby",
    });

    if (!shouldRespond) {
      const shouldRespondContext = composeContext({
        state,
        template: shouldRespondTemplate,
      });

      const response = await this.agent.runtime.completion({
        context: shouldRespondContext,
        stop: [],
      });

      console.log("*** response from ", nickname, ":", response);

      if (response.toLowerCase().includes("respond")) {
        shouldRespond = true;
      } else if (response.toLowerCase().includes("ignore")) {
        shouldRespond = false;
      } else if (response.toLowerCase().includes("stop")) {
        shouldRespond = false;
      } else {
        console.error("Invalid response:", response);
        shouldRespond = false;
      }
    }

    if (!shouldRespond) {
      console.log("Not responding to message");
      return { content: "", action: "IGNORE" };
    }

    if (!nickname) {
      console.log("No nickname found for bot");
    }

    const context = composeContext({
      state,
      template: messageHandlerTemplate(),
    });

    console.log("***** CONTEXT *****", context);

    if (this.agent.runtime.debugMode) {
      console.log(context, "Response Context");
    }

    let responseContent: Content | null = null;
    const { user_id, room_id } = message;

    for (let triesLeft = 3; triesLeft > 0; triesLeft--) {
      const response = await this.agent.runtime.completion({
        context,
        stop: [],
        temperature: this.temperature,
      });

      const values = {
        body: response,
        user_id: user_id,
        room_id,
        type: "response",
      };

      adapter.db
        .prepare(
          "INSERT INTO logs (body, user_id, room_id, type) VALUES (?, ?, ?, ?)"
        )
        .run([values.body, values.user_id, values.room_id, values.type]);

      const parsedResponse = parseJSONObjectFromText(
        response
      ) as unknown as Content;
      console.log("parsedResponse", parsedResponse);
      if (
        !(parsedResponse?.user as string)?.includes(
          (state as State).senderName as string
        )
      ) {
        if (!parsedResponse) {
          continue;
        }
        responseContent = {
          content: parsedResponse.content,
          action: parsedResponse.action,
        };
        break;
      }
    }

    if (!responseContent) {
      responseContent = {
        content: "",
        action: "IGNORE",
      };
    }

    await this.saveResponseMessage(message, state, responseContent);
    this.agent.runtime.processActions(message, responseContent, state);

    const response = responseContent;

    if (response.content) {
      console.log(`Bot would respond to tweet ${tweet.id} with: ${response.content}`);
      try {
        await this.twitterClient.sendTweet(response.content, tweet.id);
        console.log(`Successfully responded to tweet ${tweet.id}`);
        const responseInfo = `Context:\n\n${context}\n\nSelected Tweet: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.content}`;
        const debugFileName = `tweets/tweet_generation_${tweet.id}.txt`;
        fs.writeFileSync(debugFileName, responseInfo);
      } catch (error) {
        console.error(`Error sending response tweet: ${error}`);
      }
    }
  }

  private async saveResponseMessage(
    message: Message,
    state: State,
    responseContent: Content,
    userName: string = settings.TWITTER_USERNAME
  ) {
    const { room_id } = message;
    const agentId = getUuid(
      userName
    ) as UUID;

    responseContent.content = responseContent.content?.trim();

    if (responseContent.content) {
      console.log("Creating memory 2", {
        user_id: agentId!,
        content: responseContent,
        room_id,
        embedding: embeddingZeroVector,
      })
      await this.agent.ensureUserExists(agentId, userName);
      await this.agent.runtime.messageManager.createMemory({
        user_id: agentId!,
        content: responseContent,
        room_id,
        embedding: embeddingZeroVector,
      },
        false);
      await this.agent.runtime.evaluate(message, { ...state, responseContent });
    } else {
      console.warn("Empty response, skipping");
    }
  };

  private async saveRequestMessage(message: Message, state: State) {
    const { content: senderContent } = message;

    if ((senderContent as Content).content) {
      const data2 = adapter.db
        .prepare(
          "SELECT * FROM memories WHERE type = ? AND user_id = ? AND room_id = ? ORDER BY created_at DESC LIMIT 1"
        )
        .all("messages", message.user_id, message.room_id) as {
          content: Content;
        }[];

      if (data2.length > 0 && data2[0].content === message.content) {
        console.log("already saved", data2);
      } else {
        console.log("Creating memory", {
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        })
        await this.agent.runtime.messageManager.createMemory({
          user_id: message.user_id,
          content: senderContent,
          room_id: message.room_id,
          embedding: embeddingZeroVector,
        });
      }
      await this.agent.runtime.evaluate(message, {
        ...state,
        twitterMessage: message,
        twitterClient: this.twitterClient,
      });
    }
  };

  private async wait(minDuration = 1000, maxDuration = 3000) {
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * (maxDuration - minDuration)) + minDuration));
  }

  private async engageWithSearchTerms() {
    console.log('Engaging with search terms');
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error('Twitter username not set in settings');
        return;
      }
      this.wait();
      // Generate search terms based on recent conversations and Ruby's interests and bio
      const recentConversations = await this.getRecentConversations();
      // wait 1-3 seconds to avoid rate limiting
      this.wait();
      const recentSearchResults = await this.getRecentSearchResults();

      // Updated function to format recent conversations
      const formatRecentConversations = (conversations: string[]) => {
        return conversations
          .reverse()
          .map(conversation => `@${settings.TWITTER_USERNAME}: ${conversation.replace(/\n/g, '\\n')}`)
          .join('\n');
      };

      // Updated function to format recent search results
      const formatRecentSearchResults = (searchResults: Tweet[]) => {
        return searchResults
          .map(result => {
            return `${result.username}: ${result.text.replace(/\n/g, '\\n')}`;
          })
          .join('\n');
      };

      // Usage in engageWithSearchTerms
      const searchContext = composeContext({
        state: {
          agentName: settings.TWITTER_USERNAME,
          recentConversations: formatRecentConversations(recentConversations),
          recentSearchResults: formatRecentSearchResults(recentSearchResults),
          bio: this.bio,
        } as unknown as State,
        template: searchTermsTemplate(),
      });

      const searchTermsResponse = await this.agent.runtime.completion({
        context: searchContext,
        stop: [],
        temperature: this.temperature,
      });

      const searchTerm = searchTermsResponse.trim();
      console.log("Search Term:", searchTerm);

      // check if tweets folder exists and create it
      if (!fs.existsSync('tweets')) {
        fs.mkdirSync('tweets');
      }

      const tweets = this.twitterClient.searchTweets(searchTerm, 20, SearchMode.Latest);
      const tweetsArray: Tweet[] = [];
      for await (const tweet of tweets) {
        tweetsArray.push(tweet);
      }

      if (tweetsArray.length === 0) {
        console.log("No tweets found for the search term");
        return;
      }
      const prompt = `
          Here are some tweets related to the search term "${searchTerm}":
    
          ${tweetsArray.map((tweet) => `
            ID: ${tweet.id}
            Username: ${tweet.username}
            Text: ${tweet.text}
            ${tweet.urls.length > 0 && `URLs: ${tweet.urls.join(', ')}\n`}${tweet.photos.length > 0 && `Images: ${tweet.photos.map(photo => photo.url).join(', ')}\n`}
          `).join('\n')}
    
          Which tweet is the most interesting and relevant for Ruby to reply to? Please provide only the ID of the tweet in your response.
        `;

      const mostInterestingTweetResponse = await this.agent.runtime.completion({
        context: prompt,
        stop: [],
        temperature: this.temperature,
      });

      const tweetId = mostInterestingTweetResponse.trim();
      const selectedTweet = tweetsArray.find((tweet) => tweet.id.toString().includes(tweetId) || tweetId.includes(tweet.id.toString()));

      if (selectedTweet) {
        console.log("Selected tweet to reply to:", selectedTweet);
        await this.handleTweet(selectedTweet);
        const responseInfo = `\nSelected Tweet ID: ${selectedTweet.id}\nResponse Tweet ID: ${mostInterestingTweetResponse}\n`;
        const debugInfo = `Search Term Context:\n${searchContext}\n\nSearch Term:\n${searchTerm}\n\nHydrated Prompt:\n${prompt}\n\nAgent's Output:\n${searchTermsResponse}\n\n${responseInfo}`;
        const debugFileName = `tweets/tweet_generation_${tweetId}.txt`;
        fs.writeFileSync(debugFileName, debugInfo);
      } else {
        console.warn("Invalid tweet ID returned by OpenAI:", tweetId);
      }
    } catch (error) {
      console.error('Error engaging with search terms:', error);
    }
  }

  private async getRecentConversations(): Promise<string[]> {
    const botTwitterUsername = settings.TWITTER_USERNAME;
    const recentConversations = this.twitterClient.searchTweets(`@${botTwitterUsername}`, 20, SearchMode.Latest);

    const recentConversationsArray = [];
    for await (const conversation of recentConversations) {
      recentConversationsArray.push(conversation.text);
    }

    // reverse the order of the conversations so most recent are at the bottom
    recentConversationsArray.reverse();

    return recentConversationsArray;
  }

  private async getRecentSearchResults(): Promise<Tweet[]> {
    const recentSearchResults = [];
    const searchTerm = topics.sort(() => 0.5 - Math.random()).slice(0, 2).join("%20");
    const tweets = this.twitterClient.searchTweets(searchTerm, 10, SearchMode.Latest);
    for await (const tweet of tweets) {
      recentSearchResults.push(tweet);
    }

    // check if /searches exists
    if (!fs.existsSync('searches')) {
      fs.mkdirSync('searches');
    }

    // save search results to file at timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const searchResultsFileName = `searches/search_results_${timestamp}.txt`;
    fs.writeFileSync(searchResultsFileName, JSON.stringify(recentSearchResults, null, 2));

    return recentSearchResults;
  }

  private async filterRelevantReplies(replies: Tweet[]): Promise<Tweet[]> {
    const relevantReplies = [];

    for (const reply of replies) {
      const replyText = reply.text;
      const isRelevant = await this.isReplyRelevant(replyText);

      if (isRelevant) {
        relevantReplies.push(reply);
      }
    }

    return relevantReplies;
  }

  private async isReplyRelevant(replyText: string) {
    const context = composeContext({
      state: {
        replyText,
      } as unknown as State,
      template: isRelevantPrompt,
    });

    const relevanceResponse = await this.agent.runtime.completion({
      context,
      stop: [],
    });

    return relevanceResponse.trim().toLowerCase().includes('yes');
  }

  private async generateNewTweet() {
    console.log('Generating new tweet');
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error('Twitter username not set in settings');
        return;
      }

      // Get recent conversations
      const recentConversations = this.twitterClient.searchTweets(`@${botTwitterUsername}`, 20, SearchMode.Latest);

      const recentConversationsArray = [];
      while (true) {
        const next = await recentConversations.next();
        if (next.done) {
          break;
        }
        recentConversationsArray.push(next.value)
      }
      const recentConversationsText = (recentConversationsArray).map(tweet => tweet.text).join('\n');

      // Get recent search results
      const searchTerms = ["artificial intelligence", "quantum physics"];
      const recentSearchResults = [];
      for (const searchTerm of searchTerms) {
        const tweets = this.twitterClient.searchTweets(searchTerm, 20, SearchMode.Latest);
        const tweetsArray = [];
        while (true) {
          const next = await tweets.next();
          if (next.done) {
            break;
          }
          tweetsArray.push(next.value)
        }
        recentSearchResults.push(...(tweetsArray).map(tweet => tweet.text));
      }
      const recentSearchResultsText = recentSearchResults.join('\n');

      // Generate new tweet
      const context = composeContext({
        state: {
          agentName: botTwitterUsername,
          recentConversations: recentConversationsText,
          recentSearchResults: recentSearchResultsText
        } as unknown as State,
        template: newTweetPrompt,

      });

      const newTweetContent = await this.agent.runtime.completion({
        context,
        stop: [],
        temperature: this.temperature,
      });

      // Send the new tweet
      await this.twitterClient.sendTweet(newTweetContent.trim());
    } catch (error) {
      console.error('Error generating new tweet:', error);
    }
  }

  private async engageWithTimeline() {
    console.log('Engaging with timeline');
    try {
      const botTwitterUsername = settings.TWITTER_USERNAME;
      if (!botTwitterUsername) {
        console.error('Twitter username not set in settings');
        return;
      }

      // Load the tweets cache
      const tweetsCacheFilePath = path.join(__dirname, 'tweets_cache.json');
      let tweetsCache: { [tweetId: string]: boolean } = {};
      if (fs.existsSync(tweetsCacheFilePath)) {
        tweetsCache = JSON.parse(fs.readFileSync(tweetsCacheFilePath, 'utf-8'));
      }

      // Get the bot's timeline
      const timeline = this.twitterClient.getTweets(botTwitterUsername, 20);

      for await (const tweet of timeline) {
        // Check if the agent has already responded to this tweet
        if (tweetsCache[tweet.id]) {
          console.log(`Already responded to tweet ${tweet.id}, skipping`);
          continue;
        }

        const replies = this.twitterClient.searchTweets(`to:${botTwitterUsername}`, 20, SearchMode.Latest);
        let hasResponded = false;

        for await (const reply of replies) {
          if (reply.inReplyToStatusId === tweet.id && reply.username === botTwitterUsername) {
            hasResponded = true;
            tweetsCache[tweet.id] = true;
            break;
          }
        }

        console.log("tweet")
        console.log(tweet)

        if (tweet.username === settings.TWITTER_USERNAME) {
          // Skip processing if the tweet is from the bot itself
          continue;
        }

        if (hasResponded) {
          console.log(`Already responded to tweet ${tweet.id}, skipping`);
          continue;
        }

        // Check if the agent should engage with the tweet
        const shouldEngagePrompt = `
          Ruby should engage with tweets that are culturally interesting about AI, technology, and science. Here is a tweet from your timeline:
            Tweet: ${tweet.text}

            Should Ruby engage? Respond with a yes or no.
          `;

        const shouldEngageResponse = await this.agent.runtime.completion({
          context: shouldEngagePrompt,
          stop: [],
        });

        console.log("shouldEngageResponse")
        console.log(tweet.text)
        console.log(shouldEngageResponse)

        const shouldEngage = shouldEngageResponse.toLowerCase().includes('yes');

        if (shouldEngage) {
          await this.handleTweet(tweet);
          tweetsCache[tweet.id] = true;
        }
      }

      // Save the updated tweets cache
      fs.writeFileSync(tweetsCacheFilePath, JSON.stringify(tweetsCache), 'utf-8');
    } catch (error) {
      console.error('Error engaging with timeline:', error);
    }
  }

  private startTwitterLoop() {
    console.log('Starting Twitter interaction loop');
    // setInterval(() => {
    //   this.handleTwitterInteractions();
    // }, 60000); // Check every minute

    // Engage with timeline
    const engageWithTimelineLoop = () => {
      this.engageWithTimeline();
      // setTimeout(engageWithTimelineLoop, Math.floor(Math.random() * 300000) + 600000); // Random interval between 10-15 minutes
    };

    // Engage with search terms
    const engageWithSearchTermsLoop = () => {
      this.engageWithSearchTerms();
      // setTimeout(engageWithSearchTermsLoop, Math.floor(Math.random() * 300000) + 600000); // Random interval between 10-15 minutes
    };

    // Generate new tweet
    const generateNewTweetLoop = () => {
      this.generateNewTweet();
      // setTimeout(generateNewTweetLoop, Math.floor(Math.random() * 300000) + 600000); // Random interval between 10-15 minutes
    };

    // engageWithTimelineLoop();
    engageWithSearchTermsLoop();
    // generateNewTweetLoop();
  }

}