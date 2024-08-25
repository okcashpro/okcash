import EventEmitter from "events";
import fs from "fs";
import { nodewhisper } from "nodejs-whisper";
import os from "os";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { getWavHeader } from "../clients/elevenlabs/index.ts";
import settings from "../core/settings.ts";
import { File } from "formdata-node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TranscriptionService extends EventEmitter {
  private CONTENT_CACHE_DIR = "./content_cache";
  private isCudaAvailable: boolean = false;
  private openai: OpenAI | null = null;

  constructor() {
    super();
    this.ensureCacheDirectoryExists();
    if (settings.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: settings.OPENAI_API_KEY,
      });
    } else {
      this.detectCuda();
    }
  }

  private ensureCacheDirectoryExists() {
    if (!fs.existsSync(this.CONTENT_CACHE_DIR)) {
      fs.mkdirSync(this.CONTENT_CACHE_DIR);
    }
  }

  private detectCuda() {
    const platform = os.platform();
    if (platform === "linux") {
      try {
        fs.accessSync("/usr/local/cuda/bin/nvcc", fs.constants.X_OK);
        this.isCudaAvailable = true;
        console.log("CUDA detected. Transcription will use CUDA acceleration.");
      } catch (error) {
        console.log("CUDA not detected. Transcription will run on CPU.");
      }
    } else if (platform === "win32") {
      const cudaPath = path.join(
        process.env.CUDA_PATH ||
          "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v11.0",
        "bin",
        "nvcc.exe",
      );
      if (fs.existsSync(cudaPath)) {
        this.isCudaAvailable = true;
        console.log("CUDA detected. Transcription will use CUDA acceleration.");
      } else {
        console.log("CUDA not detected. Transcription will run on CPU.");
      }
    } else {
      console.log(
        "CUDA not supported on this platform. Transcription will run on CPU.",
      );
    }
  }

  public async transcribe(audioBuffer: ArrayBuffer): Promise<string | null> {
    if (this.openai) {
      return this.transcribeWithOpenAI(audioBuffer);
    } else {
      return this.transcribeLocally(audioBuffer);
    }
  }

  private async transcribeWithOpenAI(
    audioBuffer: ArrayBuffer,
  ): Promise<string | null> {
    console.log("Transcribing audio with OpenAI...");

    const wavHeader = getWavHeader(audioBuffer.byteLength, 16000);
    const file = new File([wavHeader, audioBuffer], "audio.wav", {
      type: "audio/wav",
    });

    try {
      const result = await this.openai!.audio.transcriptions.create({
        model: "whisper-1",
        language: "en",
        response_format: "text",
        file: file,
      });

      const trimmedResult = (result as any).trim();
      console.log(`OpenAI speech to text: ${trimmedResult}`);

      return trimmedResult;
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

  public async transcribeLocally(
    audioBuffer: ArrayBuffer,
  ): Promise<string | null> {
    try {
      // get the full path of this.CONTENT_CACHE_DIR
      const fullPath = path.join(__dirname, "../../", this.CONTENT_CACHE_DIR);

      const tempAudioFileShortPath = path.join(
        this.CONTENT_CACHE_DIR,
        `temp_${Date.now()}.mp3`,
      );

      // Save the audio buffer to a temporary file
      const tempAudioFile = path.join(fullPath, `temp_${Date.now()}.mp3`);
      fs.writeFileSync(tempAudioFileShortPath, Buffer.from(audioBuffer));

      // wait for 1 second
      await new Promise((resolve) => setTimeout(resolve, 100));

      let output = await nodewhisper(tempAudioFile, {
        modelName: "base.en",
        autoDownloadModelName: "base.en",
        verbose: true,
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
          splitOnWord: true,
        },
      });

      // for each line in output, if the trimmed line starts with "["...
      // look for the next "]" in the line, remove the ] and everything before it
      // and replace the line with the new line
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

      // Remove the temporary audio file
      fs.unlinkSync(tempAudioFile);

      if (!output || output.length < 5) {
        return null;
      }
      return output;
    } catch (error) {
      console.error("Error in speech-to-text conversion:", error);
      return null;
    }
  }
}
