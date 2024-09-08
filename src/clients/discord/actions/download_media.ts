import {
  Action,
  ActionExample,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "../../../core/types.ts";
import { VideoService } from "../../../services/video.ts";
import { AttachmentBuilder } from "discord.js";

export default {
  name: "DOWNLOAD_MEDIA",
  similes: ["DOWNLOAD_VIDEO", "DOWNLOAD_AUDIO", "GET_MEDIA"],
  description:
    "Downloads a video or audio file from a URL and attaches it to the response message.",
  validate: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const videoService = VideoService.getInstance(runtime as any);
    return videoService.isVideoUrl(message.content.text);
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options,
    callback: HandlerCallback,
  ) => {
    const videoService = VideoService.getInstance(runtime as any);
    const url = message.content.text;
    const mediaPath = await videoService.downloadMedia(url);

    const response: Memory = {
      userId: runtime.agentId,
      roomId: message.roomId,
      content: {
        text: `I downloaded the media from ${url} and attached it below.`,
      },
    };

    const attachment = new AttachmentBuilder(mediaPath);

    await callback({
      ...response.content,
      files: [attachment],
    });
  },
  examples: [
    // Add relevant examples here
  ] as ActionExample[][],
} as Action;
