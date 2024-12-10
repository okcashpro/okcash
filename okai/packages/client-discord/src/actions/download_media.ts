import path from "path";
import { composeContext } from "@okcashpro/okai";
import { parseJSONObjectFromText } from "@okcashpro/okai";
import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    IVideoService,
    Memory,
    ModelClass,
    ServiceType,
    State,
} from "@okcashpro/okai";
import { generateText } from "@okcashpro/okai";

export const mediaUrlTemplate = `# Messages we are searching for a media URL
{{recentMessages}}

# Instructions: {{senderName}} is requesting to download a specific media file (video or audio). Your goal is to determine the URL of the media they want to download.
The "mediaUrl" is the URL of the media file that the user wants downloaded. If not specified, return null.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "mediaUrl": "<Media URL>"
}
\`\`\`
`;

const getMediaUrl = async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
): Promise<string | null> => {
    if (!state) {
        state = (await runtime.composeState(message)) as State;
    }

    const context = composeContext({
        state,
        template: mediaUrlTemplate,
    });

    for (let i = 0; i < 5; i++) {
        const response = await generateText({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });

        const parsedResponse = parseJSONObjectFromText(response) as {
            mediaUrl: string;
        } | null;

        if (parsedResponse?.mediaUrl) {
            return parsedResponse.mediaUrl;
        }
    }
    return null;
};

export default {
    name: "DOWNLOAD_MEDIA",
    similes: [
        "DOWNLOAD_VIDEO",
        "DOWNLOAD_AUDIO",
        "GET_MEDIA",
        "DOWNLOAD_PODCAST",
        "DOWNLOAD_YOUTUBE",
    ],
    description:
        "Downloads a video or audio file from a URL and attaches it to the response message.",
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State
    ) => {
        if (message.content.source !== "discord") {
            return false;
        }
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        const videoService = runtime
            .getService<IVideoService>(ServiceType.VIDEO)
            .getInstance();
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        }

        const mediaUrl = await getMediaUrl(runtime, message, state);
        if (!mediaUrl) {
            console.error("Couldn't get media URL from messages");
            return;
        }

        const videoInfo = await videoService.fetchVideoInfo(mediaUrl);
        const mediaPath = await videoService.downloadVideo(videoInfo);

        const response: Content = {
            text: `I downloaded the video "${videoInfo.title}" and attached it below.`,
            action: "DOWNLOAD_MEDIA_RESPONSE",
            source: message.content.source,
            attachments: [],
        };

        const filename = path.basename(mediaPath);

        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                await callback(
                    {
                        ...response,
                    },
                    ["content_cache/" + filename]
                );
                break;
            } catch (error) {
                retries++;
                console.error(
                    `Error sending message (attempt ${retries}):`,
                    error
                );

                if (retries === maxRetries) {
                    console.error(
                        "Max retries reached. Failed to send message with attachment."
                    );
                    break;
                }

                // Wait for a short delay before retrying
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }

        return response;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Downloading the YouTube video now, one sec",
                    action: "DOWNLOAD_MEDIA",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you grab this video for me? https://vimeo.com/123456789",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sure thing, I'll download that Vimeo video for you",
                    action: "DOWNLOAD_MEDIA",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need this video downloaded: https://www.youtube.com/watch?v=abcdefg",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "No problem, I'm on it. I'll have that YouTube video downloaded in a jiffy",
                    action: "DOWNLOAD_MEDIA",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
