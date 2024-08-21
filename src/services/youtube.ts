import fs from 'fs';
import path from 'path';
import { default as getUuid } from "uuid-by-string";
import youtubeDl from 'youtube-dl-exec';
import parseSrt from 'srt';
import { TranscriptionService } from './transcription.ts';

type VideoResult = {
    title: string,
    channel: string,
    description: string,
    transcript: string
    
}
export class YouTubeService {
    private transcriptionService: TranscriptionService;
    private CONTENT_CACHE_DIR = './content_cache';

    constructor(transcriptionService: TranscriptionService) {
        this.transcriptionService = transcriptionService;
        this.ensureCacheDirectoryExists();
    }


    private ensureCacheDirectoryExists() {
        if (!fs.existsSync(this.CONTENT_CACHE_DIR)) {
            fs.mkdirSync(this.CONTENT_CACHE_DIR);
        }
    }

    public isVideoUrl(url: string): boolean {
        return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
    }

    public async processVideo(url: string): Promise<VideoResult> {
        // extract youtube ID from url
        const videoId = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^\/&?]+)/)?.[1] || '';
        console.log("processing video")
        const videoUuid = this.getVideoId(videoId);
        const cacheFilePath = path.join(this.CONTENT_CACHE_DIR, `${videoUuid}.json`);

        if (fs.existsSync(cacheFilePath)) {
            console.log("Returning red file")
            return JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8')) as VideoResult;
        }
        console.log("feetch video info")
        const videoInfo = await this.fetchVideoInfo(url);
        console.log("get transcript")
        const transcript = await this.getTranscript(url, videoInfo);

        const result = {
            id: videoUuid,
            url: url,
            title: videoInfo.title,
            channel: videoInfo.channel,
            description: videoInfo.description,
            transcript: transcript
        };

        fs.writeFileSync(cacheFilePath, JSON.stringify(result));
        return result;
    }

    private getVideoId(url: string): string {
        return getUuid(url) as string;
    }

    private async fetchVideoInfo(url: string): Promise<any> {
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
                subLang: 'en',
                skipDownload: true
            });
            console.log("YouTube-DL result:", JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('Error fetching video info:', error);
            throw new Error('Failed to fetch video information');
        }
    }

    private async getTranscript(url: string, videoInfo: any): Promise<string> {
        console.log("Getting transcript");
        try {
            // Check for manual subtitles
            if (videoInfo.subtitles && videoInfo.subtitles.en) {
                console.log("Manual subtitles found");
                const srtContent = await this.downloadSRT(videoInfo.subtitles.en[0].url);
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
            if (videoInfo.categories && videoInfo.categories.includes('Music')) {
                console.log("Music video detected, no lyrics available");
                return 'No lyrics available.';
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
            console.log(jsonContent)
            if (jsonContent.events) {
                return jsonContent.events
                    .filter(event => event.segs)
                    .map(event => event.segs.map(seg => seg.utf8).join(' '))
                    .join(' ');
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
            .split('\n\n')
            .map(block => block.split('\n').slice(2).join(' '))
            .join(' ');
    }


    private async downloadSRT(url: string): Promise<string> {
        console.log("downloadSRT")
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
        const transcript = await this.transcriptionService.transcribe(audioBuffer);
        const endTime = Date.now();
        console.log(`Transcription completed in ${(endTime - startTime) / 1000} seconds`);

        fs.unlinkSync(audioFilePath);
        return transcript || 'Transcription failed';
    }

    private async downloadAudio(url: string): Promise<string> {
        console.log("Downloading audio")
        const outputFile = path.join(this.CONTENT_CACHE_DIR, `${this.getVideoId(url)}.mp3`);
        try {
            console.log("Transcribing audio")
            await youtubeDl(url, {
                verbose: true,
                extractAudio: true,
                audioFormat: 'mp3',
                output: outputFile,
                writeInfoJson: true,
            });
            return outputFile;
        } catch (error) {
            console.error('Error downloading audio:', error);
            throw new Error('Failed to download audio');
        }
    }
}
