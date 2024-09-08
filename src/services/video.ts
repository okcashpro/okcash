import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import youtubeDl from "youtube-dl-exec";
import { AgentRuntime } from "../core/runtime.ts";
import { Media } from "../core/types.ts";
import { stringToUuid } from "../core/uuid.ts";

export class VideoService {
  private static instance: VideoService | null = null;
  private CONTENT_CACHE_DIR = "./content_cache";
  runtime: AgentRuntime;

  private queue: string[] = [];
  private processing: boolean = false;

  private constructor(runtime: AgentRuntime) {
    this.ensureCacheDirectoryExists();
    this.runtime = runtime;
  }

  public static getInstance(runtime: AgentRuntime): VideoService {
    if (!VideoService.instance) {
      VideoService.instance = new VideoService(runtime);
    }
    return VideoService.instance;
  }

  private ensureCacheDirectoryExists() {
    if (!fs.existsSync(this.CONTENT_CACHE_DIR)) {
      fs.mkdirSync(this.CONTENT_CACHE_DIR);
    }
  }

  public isVideoUrl(url: string): boolean {
    return (
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("vimeo.com")
    );
  }

  public async processVideo(url: string): Promise<Media> {
    this.queue.push(url);
    this.processQueue();

    return new Promise((resolve, reject) => {
      const checkQueue = async () => {
        console.log("***** CHECKING VIDEO QUEUE", this.queue);
        const index = this.queue.indexOf(url);
        if (index !== -1) {
          setTimeout(checkQueue, 100);
        } else {
          try {
            const result = await this.processVideoFromUrl(url);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      };
      checkQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const url = this.queue.shift()!;
      await this.processVideoFromUrl(url);
    }

    this.processing = false;
  }

  private async processVideoFromUrl(url: string): Promise<Media> {
    const videoId =
      url.match(
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^\/&?]+)/,
      )?.[1] || "";
    const videoUuid = this.getVideoId(videoId);
    const cacheFilePath = path.join(
      this.CONTENT_CACHE_DIR,
      `${videoUuid}.json`,
    );

    if (fs.existsSync(cacheFilePath)) {
      console.log("Returning cached video file");
      return JSON.parse(fs.readFileSync(cacheFilePath, "utf-8")) as Media;
    }

    console.log("Cache miss, processing video");
    console.log("Fetching video info");
    const videoInfo = await this.fetchVideoInfo(url);
    console.log("Getting transcript");
    const transcript = await this.getTranscript(url, videoInfo);

    const result: Media = {
      id: videoUuid,
      url: url,
      title: videoInfo.title,
      source: videoInfo.channel,
      description: videoInfo.description,
      text: transcript,
    };

    fs.writeFileSync(cacheFilePath, JSON.stringify(result));
    return result;
  }

  private getVideoId(url: string): string {
    return stringToUuid(url);
  }

  private async fetchVideoInfo(url: string): Promise<any> {
    if (url.endsWith(".mp4") || url.includes(".mp4?")) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          // If the URL is a direct link to an MP4 file, return a simplified video info object
          return {
            title: path.basename(url),
            description: "",
            channel: "",
          };
        }
      } catch (error) {
        console.error("Error downloading MP4 file:", error);
        // Fall back to using youtube-dl if direct download fails
      }
    }

    try {
      const result = await youtubeDl(url, {
        dumpJson: true,
        verbose: true,
        callHome: false,
        noCheckCertificates: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
        writeSub: true,
        writeAutoSub: true,
        subLang: "en",
        skipDownload: true,
      });
      console.log("YouTube-DL result:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error("Error fetching video info:", error);
      throw new Error("Failed to fetch video information");
    }
  }

  private async getTranscript(url: string, videoInfo: any): Promise<string> {
    console.log("Getting transcript");
    try {
      // Check for manual subtitles
      if (videoInfo.subtitles && videoInfo.subtitles.en) {
        console.log("Manual subtitles found");
        const srtContent = await this.downloadSRT(
          videoInfo.subtitles.en[0].url,
        );
        return this.parseSRT(srtContent);
      }

      // Check for automatic captions
      if (videoInfo.automatic_captions && videoInfo.automatic_captions.en) {
        console.log("Automatic captions found");
        const captionUrl = videoInfo.automatic_captions.en[0].url;
        const captionContent = await this.downloadCaption(captionUrl);
        return this.parseCaption(captionContent);
      }

      // Check if it's a music video
      if (videoInfo.categories && videoInfo.categories.includes("Music")) {
        console.log("Music video detected, no lyrics available");
        return "No lyrics available.";
      }

      // Fall back to audio transcription
      console.log("No captions found, falling back to audio transcription");
      return this.transcribeAudio(url);
    } catch (error) {
      console.error("Error in getTranscript:", error);
      throw error;
    }
  }

  private async downloadCaption(url: string): Promise<string> {
    console.log("Downloading caption from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download caption: ${response.statusText}`);
    }
    return await response.text();
  }

  private parseCaption(captionContent: string): string {
    console.log("Parsing caption");
    try {
      const jsonContent = JSON.parse(captionContent);
      console.log(jsonContent);
      if (jsonContent.events) {
        return jsonContent.events
          .filter((event) => event.segs)
          .map((event) => event.segs.map((seg) => seg.utf8).join(""))
          .join("")
          .replace("\n", " ");
      } else {
        console.error("Unexpected caption format:", jsonContent);
        return "Error: Unable to parse captions";
      }
    } catch (error) {
      console.error("Error parsing caption:", error);
      return "Error: Unable to parse captions";
    }
  }

  private parseSRT(srtContent: string): string {
    // Simple SRT parser (replace with a more robust solution if needed)
    return srtContent
      .split("\n\n")
      .map((block) => block.split("\n").slice(2).join(" "))
      .join(" ");
  }

  private async downloadSRT(url: string): Promise<string> {
    console.log("downloadSRT");
    const response = await fetch(url);
    return await response.text();
  }

  private async transcribeAudio(url: string): Promise<string> {
    console.log("Downloading audio for transcription...");
    const audioFilePath = await this.downloadAudio(url);
    console.log(`Audio downloaded to ${audioFilePath}`);

    const audioBuffer = fs.readFileSync(audioFilePath);
    console.log(`Audio file size: ${audioBuffer.length} bytes`);

    console.log("Starting transcription...");
    const startTime = Date.now();
    // make sure startTime is in UTC
    const transcript =
      await this.runtime.transcriptionService.transcribe(audioBuffer);
    const endTime = Date.now();
    console.log(
      `Transcription completed in ${(endTime - startTime) / 1000} seconds`,
    );

    fs.unlinkSync(audioFilePath);
    return transcript || "Transcription failed";
  }

  private async downloadAudio(url: string): Promise<string> {
    console.log("Downloading audio");
    const outputFile = path.join(
      this.CONTENT_CACHE_DIR,
      `${this.getVideoId(url)}.mp3`,
    );

    try {
      if (url.endsWith(".mp4") || url.includes(".mp4?")) {
        console.log(
          "Direct MP4 file detected, downloading and converting to MP3",
        );
        const tempMp4File = path.join(
          this.CONTENT_CACHE_DIR,
          `${this.getVideoId(url)}.mp4`,
        );
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(tempMp4File, buffer);

        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempMp4File)
            .output(outputFile)
            .noVideo()
            .audioCodec("libmp3lame")
            .on("end", () => {
              fs.unlinkSync(tempMp4File);
              resolve();
            })
            .on("error", (err) => {
              reject(err);
            })
            .run();
        });
      } else {
        console.log(
          "YouTube video detected, downloading audio with youtube-dl",
        );
        await youtubeDl(url, {
          verbose: true,
          extractAudio: true,
          audioFormat: "mp3",
          output: outputFile,
          writeInfoJson: true,
        });
      }
      return outputFile;
    } catch (error) {
      console.error("Error downloading audio:", error);
      throw new Error("Failed to download audio");
    }
  }
}
