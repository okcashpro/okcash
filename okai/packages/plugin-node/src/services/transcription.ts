import {
    okaiLogger,
    IAgentRuntime,
    ITranscriptionService,
    settings,
} from "@okcashpro/okai";
import { Service, ServiceType } from "@okcashpro/okai";
import { exec } from "child_process";
import { File } from "formdata-node";
import fs from "fs";
import { nodewhisper } from "nodejs-whisper";
import OpenAI from "openai"; // todo, can probably move this to model provider or whateer
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

// const __dirname = path.dirname(new URL(import.meta.url).pathname); #compatibility issues with windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

export class TranscriptionService
    extends Service
    implements ITranscriptionService
{
    static serviceType: ServiceType = ServiceType.TRANSCRIPTION;
    private CONTENT_CACHE_DIR: string;
    private DEBUG_AUDIO_DIR: string;
    private TARGET_SAMPLE_RATE = 16000; // Common sample rate for speech recognition
    private isCudaAvailable: boolean = false;
    private openai: OpenAI | null = null;

    private queue: { audioBuffer: ArrayBuffer; resolve: Function }[] = [];
    private processing: boolean = false;

    async initialize(_runtime: IAgentRuntime): Promise<void> {}

    constructor() {
        super();
        const rootDir = path.resolve(__dirname, "../../");
        this.CONTENT_CACHE_DIR = path.join(rootDir, "content_cache");
        this.DEBUG_AUDIO_DIR = path.join(rootDir, "debug_audio");
        this.ensureCacheDirectoryExists();
        this.ensureDebugDirectoryExists();
        // TODO: It'd be nice to handle this more gracefully, but we can do local transcription for now
        // TODO: remove the runtime from here, use it when called
        // if (runtime.getSetting("OPENAI_API_KEY")) {
        //     this.openai = new OpenAI({
        //         apiKey: runtime.getSetting("OPENAI_API_KEY"),
        //     });
        // } else {
        //     this.detectCuda();
        // }
    }

    private ensureCacheDirectoryExists() {
        if (!fs.existsSync(this.CONTENT_CACHE_DIR)) {
            fs.mkdirSync(this.CONTENT_CACHE_DIR, { recursive: true });
        }
    }

    private ensureDebugDirectoryExists() {
        if (!fs.existsSync(this.DEBUG_AUDIO_DIR)) {
            fs.mkdirSync(this.DEBUG_AUDIO_DIR, { recursive: true });
        }
    }

    private detectCuda() {
        const platform = os.platform();
        if (platform === "linux") {
            try {
                fs.accessSync("/usr/local/cuda/bin/nvcc", fs.constants.X_OK);
                this.isCudaAvailable = true;
                console.log(
                    "CUDA detected. Transcription will use CUDA acceleration."
                );
                // eslint-disable-next-line
            } catch (_error) {
                console.log(
                    "CUDA not detected. Transcription will run on CPU."
                );
            }
        } else if (platform === "win32") {
            const cudaPath = path.join(
                settings.CUDA_PATH ||
                    "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v11.0",
                "bin",
                "nvcc.exe"
            );
            if (fs.existsSync(cudaPath)) {
                this.isCudaAvailable = true;
                console.log(
                    "CUDA detected. Transcription will use CUDA acceleration."
                );
            } else {
                console.log(
                    "CUDA not detected. Transcription will run on CPU."
                );
            }
        } else {
            console.log(
                "CUDA not supported on this platform. Transcription will run on CPU."
            );
        }
    }

    private async convertAudio(inputBuffer: ArrayBuffer): Promise<Buffer> {
        const inputPath = path.join(
            this.CONTENT_CACHE_DIR,
            `input_${Date.now()}.wav`
        );
        const outputPath = path.join(
            this.CONTENT_CACHE_DIR,
            `output_${Date.now()}.wav`
        );

        fs.writeFileSync(inputPath, Buffer.from(inputBuffer));

        try {
            const { stdout } = await execAsync(
                `ffprobe -v error -show_entries stream=codec_name,sample_rate,channels -of json "${inputPath}"`
            );
            const probeResult = JSON.parse(stdout);
            const stream = probeResult.streams[0];

            okaiLogger.log("Input audio info:", stream);

            let ffmpegCommand = `ffmpeg -i "${inputPath}" -ar ${this.TARGET_SAMPLE_RATE} -ac 1`;

            if (stream.codec_name === "pcm_f32le") {
                ffmpegCommand += " -acodec pcm_s16le";
            }

            ffmpegCommand += ` "${outputPath}"`;

            okaiLogger.log("FFmpeg command:", ffmpegCommand);

            await execAsync(ffmpegCommand);

            const convertedBuffer = fs.readFileSync(outputPath);
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
            return convertedBuffer;
        } catch (error) {
            okaiLogger.error("Error converting audio:", error);
            throw error;
        }
    }

    private async saveDebugAudio(audioBuffer: ArrayBuffer, prefix: string) {
        this.ensureDebugDirectoryExists();

        const filename = `${prefix}_${Date.now()}.wav`;
        const filePath = path.join(this.DEBUG_AUDIO_DIR, filename);

        fs.writeFileSync(filePath, Buffer.from(audioBuffer));
        okaiLogger.log(`Debug audio saved: ${filePath}`);
    }

    public async transcribeAttachment(
        audioBuffer: ArrayBuffer
    ): Promise<string | null> {
        return await this.transcribe(audioBuffer);
    }

    public async transcribe(audioBuffer: ArrayBuffer): Promise<string | null> {
        // if the audio buffer is less than .2 seconds, just return null
        if (audioBuffer.byteLength < 0.2 * 16000) {
            return null;
        }
        return new Promise((resolve) => {
            this.queue.push({ audioBuffer, resolve });
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    public async transcribeAttachmentLocally(
        audioBuffer: ArrayBuffer
    ): Promise<string | null> {
        return this.transcribeLocally(audioBuffer);
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const { audioBuffer, resolve } = this.queue.shift()!;
            let result: string | null = null;

            if (this.openai) {
                result = await this.transcribeWithOpenAI(audioBuffer);
            } else {
                result = await this.transcribeLocally(audioBuffer);
            }

            resolve(result);
        }

        this.processing = false;
    }

    private async transcribeWithOpenAI(
        audioBuffer: ArrayBuffer
    ): Promise<string | null> {
        okaiLogger.log("Transcribing audio with OpenAI...");

        try {
            await this.saveDebugAudio(audioBuffer, "openai_input_original");

            const convertedBuffer = await this.convertAudio(audioBuffer);

            await this.saveDebugAudio(
                convertedBuffer,
                "openai_input_converted"
            );

            const file = new File([convertedBuffer], "audio.wav", {
                type: "audio/wav",
            });

            const result = await this.openai!.audio.transcriptions.create({
                model: "whisper-1",
                language: "en",
                response_format: "text",
                file: file,
            });

            const trimmedResult = (result as any).trim();
            okaiLogger.log(`OpenAI speech to text result: "${trimmedResult}"`);

            return trimmedResult;
        } catch (error) {
            okaiLogger.error(
                "Error in OpenAI speech-to-text conversion:",
                error
            );
            if (error.response) {
                okaiLogger.error("Response data:", error.response.data);
                okaiLogger.error("Response status:", error.response.status);
                okaiLogger.error("Response headers:", error.response.headers);
            } else if (error.request) {
                okaiLogger.error("No response received:", error.request);
            } else {
                okaiLogger.error("Error setting up request:", error.message);
            }
            return null;
        }
    }

    public async transcribeLocally(
        audioBuffer: ArrayBuffer
    ): Promise<string | null> {
        try {
            okaiLogger.log("Transcribing audio locally...");

            await this.saveDebugAudio(audioBuffer, "local_input_original");

            const convertedBuffer = await this.convertAudio(audioBuffer);

            await this.saveDebugAudio(convertedBuffer, "local_input_converted");

            const tempWavFile = path.join(
                this.CONTENT_CACHE_DIR,
                `temp_${Date.now()}.wav`
            );
            fs.writeFileSync(tempWavFile, convertedBuffer);

            okaiLogger.debug(`Temporary WAV file created: ${tempWavFile}`);

            let output = await nodewhisper(tempWavFile, {
                modelName: "base.en",
                autoDownloadModelName: "base.en",
                verbose: false,
                removeWavFileAfterTranscription: false,
                withCuda: this.isCudaAvailable,
                whisperOptions: {
                    outputInText: true,
                    outputInVtt: false,
                    outputInSrt: false,
                    outputInCsv: false,
                    translateToEnglish: false,
                    wordTimestamps: false,
                    timestamps_length: 60,
                    // splitOnWord: true,
                },
            });

            output = output
                .split("\n")
                .map((line) => {
                    if (line.trim().startsWith("[")) {
                        const endIndex = line.indexOf("]");
                        return line.substring(endIndex + 1);
                    }
                    return line;
                })
                .join("\n");

            fs.unlinkSync(tempWavFile);

            if (!output || output.length < 5) {
                okaiLogger.log("Output is null or too short, returning null");
                return null;
            }
            return output;
        } catch (error) {
            okaiLogger.error(
                "Error in local speech-to-text conversion:",
                error
            );
            return null;
        }
    }
}
