import { Scraper } from "agent-twitter-client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TWEETS_FILE = path.join(__dirname, "tweets.json");

// Direct credentials
const credentials = {
    username: "evepredict",
    password: "Roving4-Avoid0-Revival6-Snide3",
    email: "ilessio.aimaster@gmail.com"
};

(async () => {
    try {
        console.log(`Tweets will be saved to: ${TWEETS_FILE}`);
        
        // Create a new instance of the Scraper
        const scraper = new Scraper();

        // Log in to Twitter using the configured credentials
        await scraper.login(credentials.username, credentials.password);

        // Check if login was successful
        if (await scraper.isLoggedIn()) {
            console.log("Logged in successfully!");

            // Fetch all tweets for the user "@aixbt_agent"
            const tweets = scraper.getTweets("aixbt_agent", 2000);

            // Initialize an empty array to store the fetched tweets
            let fetchedTweets = [];

            // Load existing tweets from the JSON file if it exists
            if (fs.existsSync(TWEETS_FILE)) {
                const fileContent = fs.readFileSync(TWEETS_FILE, "utf-8");
                fetchedTweets = JSON.parse(fileContent);
                console.log(`Loaded ${fetchedTweets.length} existing tweets`);
            }

            // skip first 200
            let count = 0;

            // Fetch and process tweets
            for await (const tweet of tweets) {
                if (count < 1000) {
                    count++;
                    continue;
                }

                console.log("--------------------");
                console.log("Tweet ID:", tweet.id);
                console.log("Text:", tweet.text);
                console.log("Created At:", tweet.createdAt);
                console.log("Retweets:", tweet.retweetCount);
                console.log("Likes:", tweet.likeCount);
                console.log("--------------------");

                // Add the new tweet to the fetched tweets array
                fetchedTweets.push(tweet);

                try {
                    // Save the updated fetched tweets to the JSON file
                    fs.writeFileSync(
                        TWEETS_FILE,
                        JSON.stringify(fetchedTweets, null, 2)
                    );
                    if (count % 50 === 0) {
                        console.log(`Saved ${fetchedTweets.length} tweets to ${TWEETS_FILE}`);
                    }
                } catch (err) {
                    console.error("Error saving file:", err);
                }
            }

            console.log("All tweets fetched and saved to", TWEETS_FILE);

            // Log out from Twitter
            await scraper.logout();
            console.log("Logged out successfully!");
        } else {
            console.log("Login failed. Please check your credentials.");
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
})();
