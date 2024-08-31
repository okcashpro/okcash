import { Scraper, SearchMode, Tweet } from "agent-twitter-client";
import { IAgentRuntime } from "../../core/types.ts";

export const isValidTweet = (tweet: Tweet): boolean => {
    // Filter out tweets with too many hashtags, @s, or $ signs, probably spam or garbage
    const hashtagCount = (tweet.text?.match(/#/g) || []).length;
    const atCount = (tweet.text?.match(/@/g) || []).length;
    const dollarSignCount = tweet.text?.match(/\$/g) || [];
    const totalCount = hashtagCount + atCount + dollarSignCount.length;
  
    return hashtagCount <= 1 && atCount <= 2 && dollarSignCount.length <= 1 && totalCount <= 3;
  }

  export const searchRecentPosts = async (runtime: IAgentRuntime, twitterClient: Scraper, searchTerm: string) => {
    const recentSearchResults = [];
    const tweets = await twitterClient.fetchSearchTweets(
      searchTerm + " exclude:replies exclude:retweets",
      10,
      SearchMode.Latest,
    );
    console.log('***** tweets\n', tweets)

    // Format search results
    for (const tweet of tweets.tweets.filter(tweet => isValidTweet(tweet))) {
      let formattedTweet = `Name: ${tweet.name} (@${tweet.username})\n`;
      formattedTweet += `Time: ${tweet.timeParsed.toLocaleString()}\n`; 
      formattedTweet += `Text: ${tweet.text}\n`;

      if (tweet.photos.length > 0) {
        const photoDescriptions = await Promise.all(tweet.photos.map(async (photo) => {
          const description = await runtime.imageRecognitionService.recognizeImage(photo.url);
          return `[Photo: ${description.title} - ${description.description}]`;
        }));
        formattedTweet += `Photos: ${photoDescriptions.join(', ')}\n`;
      }

      if (tweet.videos.length > 0) {
        const videoTranscriptions = await Promise.all(tweet.videos.map(async (video) => {
          const transcription = await runtime.videoService.processVideo(video.url);
          return `[Video Transcription: ${transcription.text}]`;
        }));
        formattedTweet += `Videos: ${videoTranscriptions.join(', ')}\n`;
      }

      formattedTweet += `Replies: ${tweet.replies}, Retweets: ${tweet.retweets}, Likes: ${tweet.likes}, Views: ${tweet.views ?? "Unknown"}\n`;

      // If tweet is a reply, find the original tweet and include it
      if (tweet.inReplyToStatusId) {
        const originalTweet = tweets.tweets.find(t => t.id === tweet.inReplyToStatusId);
        if (originalTweet) {
          formattedTweet += `\nIn reply to:\n`;
          formattedTweet += `Name: ${originalTweet.name} (@${originalTweet.username})\n`;
          formattedTweet += `Time: ${originalTweet.timeParsed.toLocaleString()}\n`;
          formattedTweet += `Text: ${originalTweet.text}\n`;
        } else {
          // wait 1.5-3.5 seconds to avoid rate limiting
          const waitTime = Math.floor(Math.random() * 2000) + 1500;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          // now look up the original tweet
          const originalTweet = await twitterClient.getTweet(tweet.inReplyToStatusId);
          formattedTweet += `\nIn reply to:\n`;
          formattedTweet += `Name: ${originalTweet.name} (@${originalTweet.username})\n`;
          formattedTweet += `Time: ${originalTweet.timeParsed.toLocaleString()}\n`;
          formattedTweet += `Text: ${originalTweet.text}\n`;
        }
      }

      recentSearchResults.push(formattedTweet);
    }

    // Sort search results by timestamp  
    recentSearchResults.sort((a, b) => {
      const timeA = new Date(a.match(/Time: (.*)/)[1]).getTime();
      const timeB = new Date(b.match(/Time: (.*)/)[1]).getTime();
      return timeA - timeB;
    });

    const recentSearchResultsText = recentSearchResults.join("\n");
    return recentSearchResultsText;
  }    