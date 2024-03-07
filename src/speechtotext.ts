import OpenAI from "openai";
import settings from "./settings.ts";
import { getWavHeader } from "./util.ts";
import { File } from "formdata-node";

console.log('OpenAI key', settings.OPENAI_API_KEY);
var openAI = new OpenAI({
    apiKey: settings.OPENAI_API_KEY
});

export async function speechToText(buffer: Buffer) {
    var wavHeader = getWavHeader(buffer.length, 16000);

    const file = new File([wavHeader, buffer], 'audio.wav', { type: 'audio/wav' });

    console.log('Transcribing audio... key', settings.OPENAI_API_KEY);
    // This actually returns a string instead of the expected Transcription object 🙃
    var result = await openAI.audio.transcriptions.create({
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
        // prompt: settings.OPENAI_WHISPER_PROMPT,
        file: file,
    }, 
    {
        headers: {
            "Authentication": `Bearer ${settings.OPENAI_API_KEY}`,
        }
    }) as any as string;
    console.log(result);
    result = result.trim();
    console.log(`Speech to text: ${result}`);
    if (result == null || result.length < 5) {
        return null;
    }
    return result;
}
