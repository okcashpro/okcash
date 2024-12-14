import { Scraper } from "agent-twitter-client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, "tweet_scraped.json");
const TARGET_USERNAME = "aixbt_agent";
const MAX_TWEETS = 3000;

// Direct credentials
const credentials = {
    username: "evepredict",
    password: "Roving4-Avoid0-Revival6-Snide3",
    email: "ilessio.aimaster@gmail.com"
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeTweets() {
    try {
        console.log(`Starting tweet extraction for @${TARGET_USERNAME}`);
        console.log(`Tweets will be saved to: ${OUTPUT_FILE}`);
        
        // Create a new instance of the Scraper
        const scraper = new Scraper();

        // Login to Twitter
        console.log("Attempting to login...");
        await scraper.login(credentials.username, credentials.password);

        if (!(await scraper.isLoggedIn())) {
            throw new Error("Login failed. Please check your credentials.");
        }
        console.log("Successfully logged in to Twitter");

        // Initialize tweet storage
        let allTweets = [];
        if (fs.existsSync(OUTPUT_FILE)) {
            const existingContent = fs.readFileSync(OUTPUT_FILE, "utf-8");
            allTweets = JSON.parse(existingContent);
            console.log(`Loaded ${allTweets.length} existing tweets`);
        }

        // Get tweets iterator
        const tweets = scraper.getTweets(TARGET_USERNAME, MAX_TWEETS);
        let count = 0;

        // Fetch and process tweets
        for await (const tweet of tweets) {
            count++;
            
            // Process tweet
            const processedTweet = {
                id: tweet.id,
                text: tweet.text,
                createdAt: tweet.createdAt,
                metrics: {
                    retweets: tweet.retweetCount,
                    likes: tweet.likeCount,
                    replies: tweet.replyCount,
                    quotes: tweet.quoteCount
                },
                isRetweet: tweet.isRetweet,
                isReply: tweet.isReply,
                hasMedia: tweet.hasMedia
            };

            // Skip retweets and replies for cleaner content
            if (!processedTweet.isRetweet && !processedTweet.isReply) {
                allTweets.push(processedTweet);
                
                // Log progress
                console.log(`\n--- Tweet ${count} ---`);
                console.log(`Text: ${processedTweet.text.substring(0, 100)}...`);
                console.log(`Engagement: ${processedTweet.metrics.likes} likes, ${processedTweet.metrics.retweets} RTs`);
                
                // Save periodically to avoid losing progress
                if (count % 50 === 0) {
                    try {
                        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTweets, null, 2));
                        console.log(`\nSaved ${allTweets.length} tweets to ${OUTPUT_FILE}`);
                    } catch (err) {
                        console.error("Error saving file:", err);
                    }
                    
                    // Add a small delay to avoid rate limiting
                    await sleep(1000);
                }
            }

            if (count >= MAX_TWEETS) {
                break;
            }
        }

        // Final save
        try {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTweets, null, 2));
            console.log(`\nCompleted! Total tweets saved: ${allTweets.length}`);
        } catch (err) {
            console.error("Error saving final file:", err);
        }

        // Create a cleaned version with just tweet texts
        const cleanedTweets = allTweets.map(tweet => tweet.text);
        const cleanFile = path.join(__dirname, 'tweet_scraped_clean.json');
        try {
            fs.writeFileSync(cleanFile, JSON.stringify(cleanedTweets, null, 2));
            console.log("Created cleaned version in tweet_scraped_clean.json");
        } catch (err) {
            console.error("Error saving cleaned file:", err);
        }

        // Logout
        await scraper.logout();
        console.log("Successfully logged out from Twitter");

    } catch (error) {
        console.error("An error occurred:", error);
        process.exit(1);
    }
}

// Run the scraper
scrapeTweets(); 