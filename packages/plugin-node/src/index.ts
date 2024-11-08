import { Plugin } from "@ai16z/eliza/src/types.ts";
import { BrowserService } from "./services/browser.ts";
import { ImageDescriptionService } from "./services/image.ts";
import { LlamaService } from "./services/llama.ts";
import { PdfService } from "./services/pdf.ts";
import { SpeechService } from "./services/speech.ts";
import { TranscriptionService } from "./services/transcription.ts";
import { VideoService } from "./services/video.ts";

export const nodePlugin: Plugin = {
    name: "default",
    description: "Default plugin, with basic actions and evaluators",
    services: [
        BrowserService,
        ImageDescriptionService,
        LlamaService,
        PdfService,
        SpeechService,
        TranscriptionService,
        VideoService,
    ],
};

export default nodePlugin;
