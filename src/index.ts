console.log("ok")

import { TwitterGenerationClient } from './clients/twitter/generate.ts';
import { TwitterSearchClient } from './clients/twitter/search.ts';
import { TwitterInteractionClient } from './clients/twitter/interactions.ts';
import { DiscordClient } from './clients/discord/index.ts';
import { Agent } from './core/agent.ts';
import fs from "fs";
import yargs from "yargs";
import { SpeechSynthesizer } from "./services/speechSynthesis.ts";
import WavEncoderPkg from "wav-encoder";
interface Arguments {
    character?: string;
    twitter?: boolean;
    discord?: boolean;
}

let argv: Arguments = {
    character: "./src/default_character.json",
    twitter: false,
    discord: false
};

// test llama
// async function TestLlama() {
//     const llamaService = new LlamaService();
//     await llamaService.initialize();

//     const answer = "What is the capital of France?";
//     const temperature = 0.7;
//     const completionResponse = await llamaService.getCompletionResponse(answer, temperature);
//     console.log("Completion response:", completionResponse);

//     const input = "This is a sample input.";
//     const embeddingResponse = await llamaService.getEmbeddingResponse(input);
//     console.log("Embedding response:", embeddingResponse);
// }

(async () => {

    // Create the speech synthesizer instance
    const speechSynthesizer = await SpeechSynthesizer.create("./model.onnx");
    
    console.log("Synthesizing speech...");
    // Synthesize the speech to get a Float32Array of single channel 22050Hz audio data
    const audio = await speechSynthesizer.synthesize("Four score and seven years ago.");
    console.log("Speech synthesized");
    // Encode the audio data into a WAV format
    const { encode } = WavEncoderPkg;
    const audioData = {
        sampleRate: 22050,
        channelData: [audio]
    };
    const wavArrayBuffer = encode.sync(audioData);
    
    // Convert the ArrayBuffer to a Buffer and save it to a file
    fs.writeFileSync("test.wav", Buffer.from(wavArrayBuffer));
})()

console.log("Audio saved as test.wav");


try {
    // Parse command line arguments
    argv = yargs(process.argv)
        .option('character', {
            type: 'string',
            description: 'Path to the character JSON file'
        })
        .option('twitter', {
            type: 'boolean',
            description: 'Start only the Twitter client'
        })
        .option('discord', {
            type: 'boolean',
            description: 'Start only the Discord client'
        })
        .parseSync() as Arguments;
} catch (error) {
    console.log("Error parsing arguments:");
    console.log(error);
}

// Load character
const characterPath = argv.character || "./src/default_character.json";
const character = fs.existsSync(characterPath) ? JSON.parse(fs.readFileSync(characterPath, "utf8")) : { bio: "" };

const agent = new Agent();

function startDiscord() {
    const discordClient = new DiscordClient(agent, character.bio);
}

// check if character has a 'model' field, if so use that, otherwise use 'gpt-4o-mini'
const model = character.model || 'gpt-4o-mini';

async function startTwitter() {
    // console.log("Starting interaction client")
    // const twitterInteractionClient = new TwitterInteractionClient(agent, character, model);
    // // wait 2 seconds
    // await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Starting search client")
    const twitterSearchClient = new TwitterSearchClient(agent, character, model);
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log("Starting generation client")
    const twitterGenerationClient = new TwitterGenerationClient(agent, character, model);
}

if (argv.discord || (!argv.twitter && !argv.discord)) {
    startDiscord();
}
if (argv.twitter || (!argv.twitter && !argv.discord)) {
    startTwitter();
}
