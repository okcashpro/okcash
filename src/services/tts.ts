import { SpeechSynthesizer } from "../services/speechSynthesis.ts";

class SpeechSynthesisService {
  private speechSynthesizer: SpeechSynthesizer | null = null;

  async initialize() {
    if (this.speechSynthesizer) {
      return;
    }
    this.speechSynthesizer = await SpeechSynthesizer.create();
  }

  async synthesize(text: string): Promise<Float32Array> {
    if (!this.speechSynthesizer) {
      throw new Error("Speech synthesizer not initialized");
    }
    return await this.speechSynthesizer.synthesize(text);
  }
}

export default SpeechSynthesisService;
