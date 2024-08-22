import { pipeline as transformersPipeline } from "@xenova/transformers";
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import settings from "../settings.ts";

export class TranscriptionService {
    private transcriber: any;
    private CONTENT_CACHE_DIR = './content_cache';
    private openaiApiKey: string | undefined;

    constructor() {
        this.ensureCacheDirectoryExists();
        this.openaiApiKey = settings.OPENAI_API_KEY;
    }

    private ensureCacheDirectoryExists() {
        if (!fs.existsSync(this.CONTENT_CACHE_DIR)) {
            fs.mkdirSync(this.CONTENT_CACHE_DIR);
        }
    }

    private async initializeTranscriber() {
        if (!this.transcriber && !this.openaiApiKey) {
            console.log("Initializing local transcriber...");
            this.transcriber = await transformersPipeline(
                "automatic-speech-recognition",
                "Xenova/whisper-tiny.en"
            );
        }
    }

    public async transcribe(audioBuffer: Buffer, chunkDurationMs: number = 30000): Promise<string> {
        if (this.openaiApiKey) {
            return this.transcribeWithOpenAI(audioBuffer);
        } else {
            await this.initializeTranscriber();
            const chunks = this.splitAudioIntoChunks(audioBuffer, chunkDurationMs);
            let fullTranscript = '';

            for (let i = 0; i < chunks.length; i++) {
                console.log(`Transcribing chunk ${i + 1} of ${chunks.length}`);
                const chunkTranscript = await this.transcribeChunk(chunks[i]);
                fullTranscript += chunkTranscript + ' ';
            }

            return fullTranscript.trim();
        }
    }

    private async transcribeWithOpenAI(audioBuffer: Buffer): Promise<string> {
        console.log("Transcribing with OpenAI Whisper API...");
        const formData = new FormData();
        formData.append('file', audioBuffer, { filename: 'audio.wav' });
        formData.append('model', 'whisper-1');

        try {
            const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                },
            });

            return response.data.text;
        } catch (error) {
            console.error("Error in OpenAI speech-to-text conversion:", error);
            return '';
        }
    }

    private splitAudioIntoChunks(audioBuffer: Buffer, chunkDurationMs: number): Float32Array[] {
        const samplesPerChunk = Math.floor(48000 * (chunkDurationMs / 1000)); // Assuming 48kHz sample rate
        const chunks: Float32Array[] = [];

        for (let i = 0; i < audioBuffer.length; i += samplesPerChunk * 2) {
            const chunkBuffer = audioBuffer.slice(i, i + samplesPerChunk * 2);
            const float32Array = new Float32Array(chunkBuffer.length / 2);
            for (let j = 0; j < float32Array.length; j++) {
                float32Array[j] = chunkBuffer.readInt16LE(j * 2) / 32768.0;
            }
            chunks.push(float32Array);
        }

        return chunks;
    }

    private async transcribeChunk(chunk: Float32Array): Promise<string> {
        try {
            const output = await this.transcriber(chunk, {
                sampling_rate: 48000, // Discord's default sample rate
            });

            console.log("Transcription output:", output);

            if (!output.text || output.text.length < 5) {
                return '';
            }
            return output.text;
        } catch (error) {
            console.error("Error in speech-to-text conversion:", error);
            return '';
        }
    }
}