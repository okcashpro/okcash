import { pipeline as transformersPipeline } from "@xenova/transformers";
import { File } from "formdata-node";
import fs from 'fs';
import OpenAI from "openai";
import { getWavHeader } from "../clients/elevenlabs/index.ts";
import settings from "../settings.ts";
import EventEmitter from "events";

export class TranscriptionService extends EventEmitter {
    private openai: OpenAI | null = null;
    private localTranscriber: any = null;
    private CONTENT_CACHE_DIR = './content_cache';

    constructor() {
        super()
        this.ensureCacheDirectoryExists();
        if (settings.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: settings.OPENAI_API_KEY
            });
        }
    }

    private ensureCacheDirectoryExists() {
        if (!fs.existsSync(this.CONTENT_CACHE_DIR)) {
            fs.mkdirSync(this.CONTENT_CACHE_DIR);
        }
    }

    private async initializeLocalTranscriber() {
        if (!this.localTranscriber) {
            console.log("Initializing local transcriber...");
            this.localTranscriber = await transformersPipeline(
                "automatic-speech-recognition",
                "Xenova/whisper-tiny.en"
            );
        }
    }

    public async transcribe(audioBuffer: Buffer): Promise<string | null> {
        if (this.openai) {
            return this.transcribeWithOpenAI(audioBuffer);
        } else {
            return this.transcribeLocally(audioBuffer);
        }
    }

    private async transcribeWithOpenAI(audioBuffer: Buffer): Promise<string | null> {
        console.log('Transcribing audio with OpenAI...');
        
        const wavHeader = getWavHeader(audioBuffer.length, 16000);
        const file = new File([wavHeader, audioBuffer], 'audio.wav', { type: 'audio/wav' });

        try {
            const result = await this.openai!.audio.transcriptions.create({
                model: 'whisper-1',
                language: 'en',
                response_format: 'text',
                file: file,
            });

            console.log("result is")
            console.log(result)

            const trimmedResult = (result as any).trim();
            console.log(`OpenAI speech to text: ${trimmedResult}`);
            
            return trimmedResult.length < 5 ? null : trimmedResult;
        } catch (error) {
            console.error("Error in OpenAI speech-to-text conversion:", error);
            if (error.response) {
                console.error("Response data:", error.response.data);
                console.error("Response status:", error.response.status);
                console.error("Response headers:", error.response.headers);
            } else if (error.request) {
                console.error("No response received:", error.request);
            } else {
                console.error("Error setting up request:", error.message);
            }
            return null;
        }
    }

    private async transcribeLocally(audioBuffer: Buffer): Promise<string | null> {
        await this.initializeLocalTranscriber();
        console.log('Transcribing audio locally...');

        try {
            const float32Array = new Float32Array(audioBuffer.length / 2);
            for (let i = 0; i < float32Array.length; i++) {
                float32Array[i] = audioBuffer.readInt16LE(i * 2) / 32768.0;
            }

            const output = await this.localTranscriber(float32Array, {
                sampling_rate: 48000, // Discord's default sample rate
            });

            console.log("Local transcription output:", output);

            if (!output.text || output.text.length < 5) {
                return null;
            }
            return output.text;
        } catch (error) {
            console.error("Error in local speech-to-text conversion:", error);
            return null;
        }
    }
}