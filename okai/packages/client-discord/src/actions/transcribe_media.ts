import { composeContext } from "@okcashpro/okai";
import { generateText } from "@okcashpro/okai";
import { parseJSONObjectFromText } from "@okcashpro/okai";
import {
    Action,
    ActionExample,
    Content,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@okcashpro/okai";

export const transcriptionTemplate = `# Transcription of media file
{{mediaTranscript}}

# Instructions: Return only the full transcript of the media file without any additional context or commentary.`;

export const mediaAttachmentIdTemplate = `# Messages we are transcribing
{{recentMessages}}

# Instructions: {{senderName}} is requesting a transcription of a specific media file (audio or video). Your goal is to determine the ID of the attachment they want transcribed.
The "attachmentId" is the ID of the media file attachment that the user wants transcribed. If not specified, return null.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "attachmentId": "<Attachment ID>"
}
\`\`\`
`;

const getMediaAttachmentId = async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
): Promise<string | null> => {
    state = (await runtime.composeState(message)) as State;

    const context = composeContext({
        state,
        template: mediaAttachmentIdTemplate,
    });

    for (let i = 0; i < 5; i++) {
        const response = await generateText({
            runtime,
            context,
            modelClass: ModelClass.SMALL,
        });
        console.log("response", response);

        const parsedResponse = parseJSONObjectFromText(response) as {
            attachmentId: string;
        } | null;

        if (parsedResponse?.attachmentId) {
            return parsedResponse.attachmentId;
        }
    }
    return null;
};

const transcribeMediaAction = {
    name: "TRANSCRIBE_MEDIA",
    similes: [
        "TRANSCRIBE_AUDIO",
        "TRANSCRIBE_VIDEO",
        "MEDIA_TRANSCRIPT",
        "VIDEO_TRANSCRIPT",
        "AUDIO_TRANSCRIPT",
    ],
    description:
        "Transcribe the full text of an audio or video file that the user has attached.",
    validate: async (
        _runtime: IAgentRuntime,
        message: Memory,
        _state: State
    ) => {
        if (message.content.source !== "discord") {
            return false;
        }

        const keywords: string[] = [
            "transcribe",
            "transcript",
            "audio",
            "video",
            "media",
            "youtube",
            "meeting",
            "recording",
            "podcast",
            "call",
            "conference",
            "interview",
            "speech",
            "lecture",
            "presentation",
        ];
        return keywords.some((keyword) =>
            message.content.text.toLowerCase().includes(keyword.toLowerCase())
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        state = (await runtime.composeState(message)) as State;

        const callbackData: Content = {
            text: "", // fill in later
            action: "TRANSCRIBE_MEDIA_RESPONSE",
            source: message.content.source,
            attachments: [],
        };

        const attachmentId = await getMediaAttachmentId(
            runtime,
            message,
            state
        );
        if (!attachmentId) {
            console.error("Couldn't get media attachment ID from message");
            return;
        }

        const attachment = state.recentMessagesData
            .filter(
                (msg) =>
                    msg.content.attachments &&
                    msg.content.attachments.length > 0
            )
            .flatMap((msg) => msg.content.attachments)
            .find(
                (attachment) =>
                    attachment.id.toLowerCase() === attachmentId.toLowerCase()
            );

        if (!attachment) {
            console.error(`Couldn't find attachment with ID ${attachmentId}`);
            return;
        }

        const mediaTranscript = attachment.text;

        callbackData.text = mediaTranscript.trim();

        // if callbackData.text is < 4 lines or < 100 words, then we we callback with normal message wrapped in markdown block
        if (
            callbackData.text &&
            (callbackData.text?.split("\n").length < 4 ||
                callbackData.text?.split(" ").length < 100)
        ) {
            callbackData.text = `Here is the transcript:
\`\`\`md
${mediaTranscript.trim()}
\`\`\`
`;
            await callback(callbackData);
        }
        // if text is big, let's send as an attachment
        else if (callbackData.text) {
            const transcriptFilename = `content/transcript_${Date.now()}`;

            // save the transcript to a file
            await runtime.cacheManager.set(
                transcriptFilename,
                callbackData.text
            );

            await callback(
                {
                    ...callbackData,
                    text: `I've attached the transcript as a text file.`,
                },
                [transcriptFilename]
            );
        } else {
            console.warn(
                "Empty response from transcribe media action, skipping"
            );
        }

        return callbackData;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please transcribe the audio file I just sent.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sure, I'll transcribe the full audio for you.",
                    action: "TRANSCRIBE_MEDIA",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can I get a transcript of that video recording?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Absolutely, give me a moment to generate the full transcript of the video.",
                    action: "TRANSCRIBE_MEDIA",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;

export default transcribeMediaAction;
