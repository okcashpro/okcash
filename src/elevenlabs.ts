import { Readable } from "stream";
import { WebSocket } from "ws";
import settings from "./settings.ts";
import { prependWavHeader } from "./util.ts";

export async function textToSpeechStreaming(text: string): Promise<Readable> {
    console.log("11 TTS: " + text);
    const body = {
        "model_id": settings.ELEVENLABS_MODEL_ID,
        "text": text,
        "voice_settings": {
            "similarity_boost": settings.ELEVENLABS_VOICE_SIMILARITY_BOOST,
            "stability": settings.ELEVENLABS_VOICE_STABILITY,
            "style": settings.ELEVENLABS_VOICE_STYLE,
            "use_speaker_boost": settings.ELEVENLABS_VOICE_USE_SPEAKER_BOOST
        }
    };
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': settings.ELEVENLABS_XI_API_KEY
        },
        body: JSON.stringify(body)
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${settings.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=${settings.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY}&output_format=${settings.ELEVENLABS_OUTPUT_FORMAT}`, options);

    let status = response.status;
    if (status != 200) {
        console.log(`Received status ${status} from Eleven Labs API`);
        let errorBodyString = await response.text();
        throw new Error(`Received status ${status} from Eleven Labs API: ${errorBodyString}`);
    }

    if (response) {    
        let reader = response.body?.getReader();
        let readable = new Readable({
            read() {
                reader && reader.read().then(({ done, value }) => {
                    if (done) {
                        this.push(null);
                    } else {
                        this.push(value);
                    }
                });
            }
        });

        if (settings.ELEVENLABS_OUTPUT_FORMAT.startsWith('pcm_')) {
            const sampleRate = parseInt(settings.ELEVENLABS_OUTPUT_FORMAT.substring(4));
            var withHeader = prependWavHeader(readable, 1024 * 1024 * 100, sampleRate, 1, 16);
            return withHeader;
        } else {
            return readable;
        }
    } else {
        return new Readable({
            read() {}
        });
    }
}

function textToSpeechDualStreaming(inputStream: Readable): Readable {
    let startTime = Date.now();
    const ws = new WebSocket(`wss://api.elevenlabs.io/v1/text-to-speech/${settings.ELEVENLABS_VOICE_ID}/stream-input?model_id=${settings.ELEVENLABS_MODEL_ID}&optimize_streaming_latency=${settings.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY}&output_format=${settings.ELEVENLABS_OUTPUT_FORMAT}`);
    let output = new Readable({
        read() {}
    });
    let outputEnded = false;
    ws.on('open', () => {
        console.log('WebSocket opened');
        let openTime = Date.now();
        console.log(`WebSocket initialisation took ${openTime - startTime}ms`);
        // send initial message
        ws.send(JSON.stringify({
            text: ' ',
            voice_settings: {
                similarity_boost: settings.ELEVENLABS_VOICE_SIMILARITY_BOOST,
                stability: settings.ELEVENLABS_VOICE_STABILITY,
                style: settings.ELEVENLABS_VOICE_STYLE,
                use_speaker_boost: settings.ELEVENLABS_VOICE_USE_SPEAKER_BOOST
            },
            generation_config: {
                chunk_length_schedule: [150]
            },
            xi_api_key: settings.ELEVENLABS_XI_API_KEY
        }));

        inputStream.on('data', (chunk: Buffer) => {
            let asString = chunk.toString();
            console.log("11: " + asString);
            let opts = {
                text: asString,
                try_trigger_generation: true
            };
            ws.send(JSON.stringify(opts));
        });
    });
    inputStream.on('end', () => {
        console.log("Sending EOS");
        let eosOpts = {
            text: '',
            try_trigger_generation: true
        };
        ws.send(JSON.stringify(eosOpts));
    });
    ws.on('message', (data: string) => {
        let response = JSON.parse(data);
        if (response.isFinal) {
            console.log("Received final response from Eleven Labs API");
            if (!outputEnded) {
                outputEnded = true;
                output.push(null);
            }
        } else if (response.audio) {
            let audioChunk = Buffer.from(response.audio, 'base64');
            console.log(`Received audio chunk of length ${audioChunk.length}`);
            output.push(audioChunk);
        } else {
            console.log("Received non-audio response from Eleven Labs API");
            console.log(response);
        }
    });
    ws.on('close', (code, reason) => {
        console.log('WebSocket closed');
        if (code != 1000) {
            console.log(`WebSocket closed with code ${code} and reason ${reason}`);
        }
        if (!outputEnded) {
            outputEnded = true;
            output.push(null);
        }
    });
    if (settings.ELEVENLABS_OUTPUT_FORMAT.startsWith('pcm_')) {
        const sampleRate = parseInt(settings.ELEVENLABS_OUTPUT_FORMAT.substring(4));
        var withHeader = prependWavHeader(output, 1024 * 1024 * 100, sampleRate, 1, 16);
        return withHeader;
    } else {
        return output;
    }
}

export async function textToSpeech(input: string): Promise<Readable> {
        return await textToSpeechStreaming(input);
}

export async function listVoices() {
    let modelsResp = await fetch('https://api.elevenlabs.io/v1/voices', { method: 'GET', headers: { 'xi-api-key': settings.ELEVENLABS_XI_API_KEY } });
    let status = modelsResp.status;
    if (status != 200) {
        console.log(`Received status ${status} from Eleven Labs API`);
        let errorBodyString = await modelsResp.text();
        throw new Error(`Received status ${status} from Eleven Labs API: ${errorBodyString}`);
    }

    let models = await modelsResp.json();

    return models;
}

export async function listModels() {
    let modelsResp = await fetch('https://api.elevenlabs.io/v1/models', { method: 'GET', headers: { 'xi-api-key': settings.ELEVENLABS_XI_API_KEY } });
    let status = modelsResp.status;
    if (status != 200) {
        console.log(`Received status ${status} from Eleven Labs API`);
        let errorBodyString = await modelsResp.text();
        throw new Error(`Received status ${status} from Eleven Labs API: ${errorBodyString}`);
    }

    let models = await modelsResp.json();

    return models;
}

export class ElevenLabsConverter extends Readable {
    private inputStream: Readable;
    private ws: WebSocket;
    private inputEnded: boolean = false;
    private outputEnded: boolean = false;
    private startTime: number;
    private openTime: number = 0;
    private buffers: Buffer[] = [];
    private draining: boolean = false;
    private firstDataTime: number = -1;

    constructor(inputStream: Readable) {
        super();
        this.inputStream = inputStream;
        this.startTime = Date.now();
        this.ws = new WebSocket(`wss://api.elevenlabs.io/v1/text-to-speech/${settings.ELEVENLABS_VOICE_ID}/stream-input?model_id=${settings.ELEVENLABS_MODEL_ID}&optimize_streaming_latency=${settings.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY}&output_format=${settings.ELEVENLABS_OUTPUT_FORMAT}`);
        this.ws.on('open', () => {
            console.log('WebSocket opened');
            this.openTime = Date.now();
            console.log(`WebSocket initialisation took ${this.openTime - this.startTime}ms`);
            // send initial message
            this.ws.send(JSON.stringify({
                text: ' ',
                voice_settings: {
                    similarity_boost: settings.ELEVENLABS_VOICE_SIMILARITY_BOOST,
                    stability: settings.ELEVENLABS_VOICE_STABILITY,
                    style: settings.ELEVENLABS_VOICE_STYLE,
                    use_speaker_boost: settings.ELEVENLABS_VOICE_USE_SPEAKER_BOOST
                },
                generation_config: {
                    chunk_length_schedule: [50]
                },
                xi_api_key: settings.ELEVENLABS_XI_API_KEY
            }));

            this.inputStream.on('data', (chunk: Buffer) => {
                let asString = chunk.toString();
                //console.log("11: " + asString);
                let opts = {
                    text: asString,
                    try_trigger_generation: true
                };
                this.ws.send(JSON.stringify(opts));
            });
        });
        this.inputStream.on('end', () => {
            console.log("Sending EOS");
            let eosOpts = {
                text: '',
                try_trigger_generation: true
            };
            this.ws.send(JSON.stringify(eosOpts));
        });
        this.ws.on('message', (data: string) => {
            let response = JSON.parse(data);
            if (response.isFinal) {
                console.log("Received final response from Eleven Labs API");
                let endTime = Date.now();
                console.log(`Final audio packet received after ${endTime - this.startTime}ms`);
                this.inputEnded = true;
                this.drain();
            } else if (response.audio) {
                if (this.firstDataTime == -1) {
                    this.firstDataTime = Date.now();
                    console.log(`First audio packet received after ${this.firstDataTime - this.openTime}ms`);
                }
                let audioChunk = Buffer.from(response.audio, 'base64');
                console.log(`Received audio chunk of length ${audioChunk.length}`);
                if (this.draining) {
                    this.buffers.push(audioChunk);
                    this.drain();
                } else {
                    console.log("Buffering");
                    this.buffers.push(audioChunk);
                }
            } else {
                console.log("Received non-audio response from Eleven Labs API");
                console.log(response);
            }
        });
        this.ws.on('close', (code, reason) => {
            console.log('WebSocket closed');
            if (code != 1000) {
                console.log(`WebSocket closed with code ${code} and reason ${reason}`);
            }
            this.inputEnded = true;
            this.drain();
        });
    }

    _read(size: number) {
        console.log(`_read(${size})`);
        this.draining = true;
        this.drain();
    }

    private drain() {
        if (this.outputEnded) {
            console.log("_read: Output ended");
            this.push(null);
            return;
        }
        while (this.draining) {
            console.log("Draining");
            if (this.buffers.length == 0) {
                if (this.inputEnded) {
                    console.log("Input ended");
                    this.outputEnded = true;
                    this.push(null);
                    return;
                } else {
                    console.log("No buffers, sending dummy buffer");
                    this.push(Buffer.alloc(16384));
                    return;
                }
            }
            let buffer = this.buffers[0];
            if (buffer.length < 16384) {
                this.buffers.shift();
                this.draining = this.push(buffer);
                console.log(`Pushed buffer of length ${buffer.length}, new draining: ${this.draining}`);
                this.draining = true;
            } else {
                const bufferSlice = buffer.subarray(0, 16384);
                this.buffers[0] = buffer.subarray(16384);
                this.draining = this.push(bufferSlice);
                console.log(`Pushed buffer slice of length ${bufferSlice.length}, new draining: ${this.draining}`);
                this.draining = true;
            }
        }
    }
}
