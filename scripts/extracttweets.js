import fs from "fs";

const EXPORTED_DATA_FILE = "tweets.json";
const TWEETS_FILE = "exportedtweets.json";

// Read the exported data from the JSON file
const exportedData = JSON.parse(fs.readFileSync(EXPORTED_DATA_FILE, "utf-8"));

// Extract the text of each tweet
const tweetTexts = exportedData
    .map((tweet) => {
        console.log(tweet.username);
        if (tweet.username.toLowerCase().replace("@pmarca", "") !== "pmarca") {
            return null;
        } else {
            console.log("pmarca found");
        }

        if (tweet.isRetweet && tweet.retweetedStatus) {
            // If the tweet is a retweet, use the text of the retweeted status
            return tweet.retweetedStatus.text;
        } else {
            // Otherwise, use the text of the tweet itself
            return tweet.text;
        }
    })
    .filter((tweet) => tweet !== null);

// Write the array of tweet texts to the tweets.json file
fs.writeFileSync(TWEETS_FILE, JSON.stringify(tweetTexts, null, 2));

console.log("Tweet texts extracted and saved to", TWEETS_FILE);
