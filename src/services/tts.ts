import { SpeechSynthesizer } from "../services/speechSynthesis.ts";

class SpeechSynthesisService {
    private speechSynthesizer: SpeechSynthesizer;

    constructor() {
        this.speechSynthesizer = null;
    }

    async initialize() {
        if (this.speechSynthesizer) {
            return;
        }
        this.speechSynthesizer = await SpeechSynthesizer.create();
    }

    async synthesize(text: string): Promise<Float32Array> {
        if (!this.speechSynthesizer) {
            console.error("Speech synthesizer not initialized");
            return;
        }
        return await this.speechSynthesizer.synthesize(text);
    }
}

export default SpeechSynthesisService;