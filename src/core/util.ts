import { Readable, PassThrough } from "stream";

export async function readableToString(readable: Readable): Promise<string> {
    let result = '';
    for await (const chunk of readable) {
        result += chunk;
    }
    return result;
}

export function getWavHeader(audioLength: number, sampleRate: number, channelCount: number = 1, bitsPerSample: number = 16): Buffer {
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36 + audioLength, 4); // Length of entire file in bytes minus 8
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // Length of format data
    wavHeader.writeUInt16LE(1, 20); // Type of format (1 is PCM)
    wavHeader.writeUInt16LE(channelCount, 22); // Number of channels
    wavHeader.writeUInt32LE(sampleRate, 24); // Sample rate
    wavHeader.writeUInt32LE(sampleRate * bitsPerSample * channelCount / 8, 28); // Byte rate
    wavHeader.writeUInt16LE(bitsPerSample * channelCount / 8, 32); // Block align ((BitsPerSample * Channels) / 8)
    wavHeader.writeUInt16LE(bitsPerSample, 34); // Bits per sample
    wavHeader.write('data', 36); // Data chunk header
    wavHeader.writeUInt32LE(audioLength, 40); // Data chunk size
    return wavHeader;
}

export function prependWavHeader(readable: Readable, audioLength: number, sampleRate: number, channelCount: number = 1, bitsPerSample: number = 16): Readable {
    const wavHeader = getWavHeader(audioLength, sampleRate, channelCount, bitsPerSample);
    let pushedHeader = false;
    const passThrough = new PassThrough();
    readable.on('data', function (data) {
        if (!pushedHeader) {
            passThrough.push(wavHeader);
            pushedHeader = true;
        }
        passThrough.push(data);
    });
    readable.on('end', function () {
        passThrough.end();
    });
    return passThrough;
}


export function extractAnswer(text: string): string {
    const startIndex = text.indexOf('Answer: ') + 8;
    const endIndex = text.indexOf('<|endoftext|>', 11);
    return text.slice(startIndex, endIndex);
};