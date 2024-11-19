export * from "./services/index.ts";

import { Plugin } from "@ai16z/eliza";

import {
    BrowserService,
    ImageDescriptionService,
    LlamaService,
    PdfService,
    SpeechService,
    TranscriptionService,
    VideoService,
} from "./services/index.ts";

export const nodePlugin: Plugin = {
    name: "default",
    description: "Default plugin, with basic actions and evaluators",
    services: [
        new BrowserService(),
        new ImageDescriptionService(),
        new LlamaService(),
        new PdfService(),
        new SpeechService(),
        new TranscriptionService(),
        new VideoService(),
    ],
};

export default nodePlugin;
