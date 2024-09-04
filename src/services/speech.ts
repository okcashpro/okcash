import ESpeakNg from "espeak-ng";
import * as fs from "fs";
import ort from "onnxruntime-node";
import { PassThrough, Readable } from "stream";
import WavEncoder from "wav-encoder";
import { WebSocket } from "ws";
import settings from "../core/settings.ts";
import { getWavHeader } from "./audioUtils.ts";

ort.env.remoteModels = false;

enum PuncPosition {
  BEGIN = 0,
  END = 1,
  MIDDLE = 2,
  ALONE = 3,
}

interface PuncIndex {
  punc: string;
  position: PuncPosition;
}

class Punctuation {
  private _puncs: string;
  private puncsRegularExp: RegExp;
  private static readonly _DEF_PUNCS: string = ';:,.!?¡¿—…"«»“”';

  constructor(puncs: string = Punctuation._DEF_PUNCS) {
    this._puncs = puncs;
    this.puncsRegularExp = new RegExp(
      `(\\s*[${this.escapeRegExp(this._puncs)}]+\\s*)+`,
      "g",
    );
  }

  get puncs(): string {
    return this._puncs;
  }

  set puncs(value: string) {
    if (typeof value !== "string") {
      throw new Error("Punctuations must be of type string.");
    }
    this._puncs = Array.from(new Set(value.split(""))).join("");
    this.puncsRegularExp = new RegExp(
      `(\\s*[${this.escapeRegExp(this._puncs)}]+\\s*)+`,
      "g",
    );
  }

  private escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  strip(text: string): string {
    return text.replace(this.puncsRegularExp, " ").trim();
  }

  strip_to_restore(text: string): [string[], PuncIndex[]] {
    return this._strip_to_restore(text);
  }

  private _strip_to_restore(text: string): [string[], PuncIndex[]] {
    const matches = Array.from(text.matchAll(this.puncsRegularExp));
    if (matches.length === 0) {
      return [[text], []];
    }

    if (matches.length === 1 && matches[0][0] === text) {
      return [[], [{ punc: text, position: PuncPosition.ALONE }]];
    }

    const puncs: PuncIndex[] = [];
    const splitText: string[] = [];
    let lastIndex = 0;

    matches.forEach((match, index) => {
      const position =
        index === 0 && text.startsWith(match[0])
          ? PuncPosition.BEGIN
          : index === matches.length - 1 && text.endsWith(match[0])
            ? PuncPosition.END
            : PuncPosition.MIDDLE;

      splitText.push(text.substring(lastIndex, match.index));
      puncs.push({ punc: match[0], position });
      lastIndex = match.index! + match[0].length;
    });

    if (lastIndex < text.length) {
      splitText.push(text.substring(lastIndex));
    }

    return [splitText, puncs];
  }

  static restore(text: string[], puncs: PuncIndex[]): string {
    return this._restore(text, puncs, 0);
  }

  private static _restore(
    text: string[],
    puncs: PuncIndex[],
    num: number,
  ): string {
    if (puncs.length === 0) {
      return text.join("");
    }

    const current = puncs[0];

    switch (current.position) {
      case PuncPosition.BEGIN:
        return this._restore(
          [current.punc + text[0], ...text.slice(1)],
          puncs.slice(1),
          num,
        );
      case PuncPosition.END:
        return (
          text[0] +
          current.punc +
          this._restore(text.slice(1), puncs.slice(1), num + 1)
        );
      case PuncPosition.ALONE:
        return current.punc + this._restore(text, puncs.slice(1), num + 1);
      case PuncPosition.MIDDLE:
        if (text.length === 1) {
          return this._restore([text[0] + current.punc], puncs.slice(1), num);
        }
        return this._restore(
          [text[0] + current.punc + text[1], ...text.slice(2)],
          puncs.slice(1),
          num,
        );
    }
  }
}
type Vocabulary = { [character: string]: number };

export function prependWavHeader(
  readable: Readable,
  audioLength: number,
  sampleRate: number,
  channelCount: number = 1,
  bitsPerSample: number = 16,
): Readable {
  const wavHeader = getWavHeader(
    audioLength,
    sampleRate,
    channelCount,
    bitsPerSample,
  );
  let pushedHeader = false;
  const passThrough = new PassThrough();
  readable.on("data", function (data) {
    if (!pushedHeader) {
      passThrough.push(wavHeader);
      pushedHeader = true;
    }
    passThrough.push(data);
  });
  readable.on("end", function () {
    passThrough.end();
  });
  return passThrough;
}

export async function textToSpeechStreaming(text: string) {
  console.log("11 TTS: " + text);
  const body = {
    model_id: settings.ELEVENLABS_MODEL_ID,
    text: text,
    voice_settings: {
      similarity_boost: settings.ELEVENLABS_VOICE_SIMILARITY_BOOST,
      stability: settings.ELEVENLABS_VOICE_STABILITY,
      style: settings.ELEVENLABS_VOICE_STYLE,
      use_speaker_boost: settings.ELEVENLABS_VOICE_USE_SPEAKER_BOOST,
    },
  };
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": settings.ELEVENLABS_XI_API_KEY,
    },
    body: JSON.stringify(body),
  };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${settings.ELEVENLABS_VOICE_ID}/stream?optimize_streaming_latency=${settings.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY}&output_format=${settings.ELEVENLABS_OUTPUT_FORMAT}`,
    options,
  );

  const status = response.status;
  if (status != 200) {
    console.log(`Received status ${status} from Eleven Labs API`);
    const errorBodyString = await response.text();
    throw new Error(
      `Received status ${status} from Eleven Labs API: ${errorBodyString}`,
    );
  }

  if (response) {
    const reader = response.body?.getReader();
    const readable = new Readable({
      read() {
        reader &&
          reader.read().then(({ done, value }) => {
            if (done) {
              this.push(null);
            } else {
              this.push(value);
            }
          });
      },
    });

    if (settings.ELEVENLABS_OUTPUT_FORMAT.startsWith("pcm_")) {
      const sampleRate = parseInt(
        settings.ELEVENLABS_OUTPUT_FORMAT.substring(4),
      );
      const withHeader = prependWavHeader(
        readable,
        1024 * 1024 * 100,
        sampleRate,
        1,
        16,
      );
      return withHeader;
    } else {
      return readable;
    }
  } else {
    return new Readable({
      read() {},
    });
  }
}

export async function textToSpeech(input: string) {
  return await textToSpeechStreaming(input);
}

export async function listVoices() {
  const modelsResp = await fetch("https://api.elevenlabs.io/v1/voices", {
    method: "GET",
    headers: { "xi-api-key": settings.ELEVENLABS_XI_API_KEY },
  });
  const status = modelsResp.status;
  if (status != 200) {
    console.log(`Received status ${status} from Eleven Labs API`);
    const errorBodyString = await modelsResp.text();
    throw new Error(
      `Received status ${status} from Eleven Labs API: ${errorBodyString}`,
    );
  }

  const models = await modelsResp.json();

  return models;
}

export async function listModels() {
  const modelsResp = await fetch("https://api.elevenlabs.io/v1/models", {
    method: "GET",
    headers: { "xi-api-key": settings.ELEVENLABS_XI_API_KEY },
  });
  const status = modelsResp.status;
  if (status != 200) {
    console.log(`Received status ${status} from Eleven Labs API`);
    const errorBodyString = await modelsResp.text();
    throw new Error(
      `Received status ${status} from Eleven Labs API: ${errorBodyString}`,
    );
  }

  const models = await modelsResp.json();

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
    this.ws = new WebSocket(
      `wss://api.elevenlabs.io/v1/text-to-speech/${settings.ELEVENLABS_VOICE_ID}/stream-input?model_id=${settings.ELEVENLABS_MODEL_ID}&optimize_streaming_latency=${settings.ELEVENLABS_OPTIMIZE_STREAMING_LATENCY}&output_format=${settings.ELEVENLABS_OUTPUT_FORMAT}`,
    );
    this.ws.on("open", () => {
      console.log("WebSocket opened");
      this.openTime = Date.now();
      console.log(
        `WebSocket initialisation took ${this.openTime - this.startTime}ms`,
      );
      // send initial message
      this.ws.send(
        JSON.stringify({
          text: " ",
          voice_settings: {
            similarity_boost: settings.ELEVENLABS_VOICE_SIMILARITY_BOOST,
            stability: settings.ELEVENLABS_VOICE_STABILITY,
            style: settings.ELEVENLABS_VOICE_STYLE,
            use_speaker_boost: settings.ELEVENLABS_VOICE_USE_SPEAKER_BOOST,
          },
          generation_config: {
            chunk_length_schedule: [50],
          },
          xi_api_key: settings.ELEVENLABS_XI_API_KEY,
        }),
      );

      this.inputStream.on("data", (chunk: Buffer) => {
        const asString = chunk.toString();
        //console.log("11: " + asString);
        const opts = {
          text: asString,
          try_trigger_generation: true,
        };
        this.ws.send(JSON.stringify(opts));
      });
    });
    this.inputStream.on("end", () => {
      console.log("Sending EOS");
      const eosOpts = {
        text: "",
        try_trigger_generation: true,
      };
      this.ws.send(JSON.stringify(eosOpts));
    });
    this.ws.on("message", (data: string) => {
      const response = JSON.parse(data);
      if (response.isFinal) {
        console.log("Received final response from Eleven Labs API");
        const endTime = Date.now();
        console.log(
          `Final audio packet received after ${endTime - this.startTime}ms`,
        );
        this.inputEnded = true;
        this.drain();
      } else if (response.audio) {
        if (this.firstDataTime == -1) {
          this.firstDataTime = Date.now();
          console.log(
            `First audio packet received after ${this.firstDataTime - (this.openTime || 0)}ms`,
          );
        }
        const audioChunk = Buffer.from(response.audio, "base64");
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
    this.ws.on("close", (code, reason) => {
      console.log("WebSocket closed");
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
      const buffer = this.buffers[0];
      if (buffer.length < 16384) {
        this.buffers.shift();
        this.draining = this.push(buffer);
        console.log(
          `Pushed buffer of length ${buffer.length}, new draining: ${this.draining}`,
        );
        this.draining = true;
      } else {
        const bufferSlice = buffer.subarray(0, 16384);
        this.buffers[0] = buffer.subarray(16384);
        this.draining = this.push(bufferSlice);
        console.log(
          `Pushed buffer slice of length ${bufferSlice.length}, new draining: ${this.draining}`,
        );
        this.draining = true;
      }
    }
  }
}

class TextTokenizer {
  protected vocab: Vocabulary;
  protected pad: string;
  protected eos: string;
  protected bos: string;
  protected blank: string;
  protected characters: string;
  protected punctuations: string;

  constructor(
    characters: string,
    punctuations: string,
    pad: string = "<PAD>",
    eos: string = "<EOS>",
    bos: string = "<BOS>",
    blank: string = "<BLNK>",
  ) {
    this.pad = pad;
    this.eos = eos;
    this.bos = bos;
    this.blank = blank;
    this.characters = characters;
    this.punctuations = punctuations;
    this.vocab = this.createVocab();
  }

  protected createVocab(): Vocabulary {
    const vocab: Vocabulary = {};
    let index = 0;

    // Add special symbols conditionally
    [this.pad, this.eos, this.bos, this.blank].forEach((symbol) => {
      if (symbol && symbol.length > 0) vocab[symbol] = index++;
    });

    // Add characters and punctuations
    [...this.characters].concat([...this.punctuations]).forEach((char) => {
      if (!Object.prototype.hasOwnProperty.call(vocab, char)) {
        vocab[char] = index++;
      }
    });

    return vocab;
  }

  public tokenize(text: string): number[] {
    // NOTE: We use the spread operator here
    // to avoid any issues with multi-point
    // unicode characters that could exist.
    return [...text].map((char) => {
      if (char in this.vocab) {
        return this.vocab[char];
      } else {
        throw new Error(`Character: ${char}, does not exist in vocabulary.`);
      }
    });
  }
}

class VitsTokenizer extends TextTokenizer {
  constructor(
    graphemes: string = "",
    punctuations: string = "",
    pad: string = "_",
    ipaCharacters: string = "",
  ) {
    // Concatenate graphemes and IPA characters if IPA characters are provided
    if (ipaCharacters) {
      graphemes += ipaCharacters;
    }

    // Call the super constructor of TextTokenizer
    super(graphemes, punctuations, pad, undefined, undefined, "<BLNK>");
  }

  public intersperseBlankChar(charSequence: string | string[]): Array<string> {
    const charToUse = this.blank
      ? this.vocab[this.blank] + 1
      : this.vocab[this.pad];
    const result = new Array(charSequence.length * 2 + 1).fill(charToUse);
    for (let i = 0; i < charSequence.length; i++) {
      result[i * 2 + 1] = charSequence[i];
    }
    return result;
  }

  protected override createVocab(): Vocabulary {
    const vocab: Vocabulary = {};

    // Add pad and punctuations to vocab
    [this.pad, ...this.punctuations, ...this.characters, this.blank].forEach(
      (symbol) => {
        if (symbol && !Object.prototype.hasOwnProperty.call(vocab, symbol)) {
          vocab[symbol] = Object.keys(vocab).length;
        }
      },
    );

    return vocab;
  }
}

class EspeakPhonemizer {
  private punctuation: Punctuation;
  private language: string;
  private ipaFlag: number;

  /**
   * Creates a new instance of a phenomizer that calls E-Speak via WASM.
   *
   * @param language - A language code used by E-Speak to phenomize your text.
   * @param ipaFlag - The IPA version you want E-Speak to generate.
   */
  constructor(language: string = "en", ipaFlag: number = 3) {
    this.language = language;
    this.ipaFlag = ipaFlag;
    this.punctuation = new Punctuation();
  }

  public async phonemize(text: string): Promise<string> {
    // Note: Splits text based on punctuation this is needed
    // to retain punctuation as E-Speak does not include
    // any punctuation in it's phonetic output.
    const [segments, puncMap] = this.punctuation.strip_to_restore(text);

    const phonemizedText: Array<string> = [];

    for (const segment of segments) {
      try {
        // Note: This is a WASM module that we're using
        // to call the E-Speak CLI. There is most likely
        // a more performant way to accomplish what we
        // want long term by calling C functions directly.
        const espeak = await ESpeakNg({
          arguments: [
            "--phonout",
            "generated",
            '--sep=""',
            "-q",
            "-b=1",
            `--ipa=${this.ipaFlag}`,
            "-v",
            `${this.language}`,
            `"${segment}"`,
          ],
        });

        const phenoms = espeak.FS.readFile("generated", { encoding: "utf8" });

        phonemizedText.push(this.clean(phenoms));
      } catch (error) {
        console.error("Error calling E-Speak:", error);
        throw error;
      }
    }

    // TODO: We may need to add logic here to remove/clean up the espeak
    // WASM module after it's execution is completed.

    return Punctuation.restore(phonemizedText, puncMap);
  }

  private clean(text: string): string {
    // Note: E-Speak likes to include newlines, returns, etc...
    // for our use case we need all of these removed as they
    // will never exist in our models vocabulary.
    text = text.replace(/\r\n|\n|\r/gm, " ").trim();

    // NOTE: Here there be dragons, for some reason espeak-ng
    // attaches ZJW characters that don't exist in our vocab.
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

    return text;
  }
}
/**
 * Replaces any symbols that shouldn't remain in the text with their
 * language specific representations.
 *
 * @param text - Input text to process.
 * @param lang - The language you want to replace symbols for.
 * @returns - Text.
 */
const replaceSymbols = (text: string, lang: string = "en"): string => {
  text = text.replace(/;/g, ",");
  text = text.replace(/:/g, ",");

  // Replace '-' based on language
  if (lang !== "ca") {
    text = text.replace(/-/g, " ");
  } else {
    text = text.replace(/-/g, "");
  }

  // Replace '&' based on language
  switch (lang) {
    case "en":
      text = text.replace(/&/g, " and ");
      break;
    case "fr":
      text = text.replace(/&/g, " et ");
      break;
    case "pt":
      text = text.replace(/&/g, " e ");
      break;
    case "ca":
      text = text.replace(/&/g, " i ");
      text = text.replace(/'/g, "");
      break;
  }

  return text;
};

/**
 * Removes multi character whitespace from text and trims
 * leading and trailing white space.
 *
 * @param text - Input text to process.
 * @returns - Text
 */
const collapseWhitespace = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

/**
 * Removes symbols that don't typically have a textual
 * representation or are considered auxilery to the real
 * contents of text.
 *
 * @param text - Input text to process.
 * @returns - Text
 */
const removeAuxSymbols = (text: string): string => {
  // eslint-disable-next-line no-useless-escape
  return text.replace(/[<>()\[\]"]+/g, "");
};

/**
 * Processes input text through a cleaning pipline to ensure
 * that it's ready to be converted to phonemes by common phonemizers.
 *
 * @remarks - This method assumes that the input language is english.
 * @param text - Input text to process and make ready for a TTS system.
 * @returns - Text.
 */
const phonemeCleaner = (text: string) => {
  text = replaceSymbols(text);
  text = removeAuxSymbols(text);
  text = collapseWhitespace(text);

  return text;
};
class SpeechService {
  private tokenizer: VitsTokenizer;
  private phenomizer: EspeakPhonemizer;
  private session: ort.InferenceSession;

  static modelPath: string = "./model.onnx";
  private static instance: SpeechService | null = null;

  private constructor(session: ort.InferenceSession) {
    this.session = session;
    this.phenomizer = new EspeakPhonemizer("en-us");
    this.tokenizer = new VitsTokenizer(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      ';:,.!?¡¿—…"«»“” ',
      "_",
      "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ",
    );
  }

  static async generate(text: string): Promise<Readable> {
    // check for elevenlabs API key
    if (process.env.ELEVENLABS_XI_API_KEY) {
      return textToSpeech(text);
    }

    if (!this.instance) {
      this.instance = await this.create();
    }

    // Generate the speech to get a Float32Array of single channel 22050Hz audio data
    const audio = await SpeechService.instance.synthesize(text);

    // Encode the audio data into a WAV format
    const { encode } = WavEncoder;
    const audioData = {
      sampleRate: 22050,
      channelData: [audio],
    };
    const wavArrayBuffer = encode.sync(audioData);

    // TODO: Move to a temp file
    // Convert the ArrayBuffer to a Buffer and save it to a file
    fs.writeFileSync("buffer.wav", Buffer.from(wavArrayBuffer));

    // now read the file
    const wavStream = fs.createReadStream("buffer.wav");
    return wavStream;
  }

  private static async create(uri: string = this.modelPath) {
    // check if model.onnx exists
    if (!fs.existsSync(uri)) {
      console.log("Model file does not exist, downloading...");
      const response = await fetch(
        "https://media.githubusercontent.com/media/ianmarmour/speech-synthesizer/main/model/vits.onnx?download=true",
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(uri, Buffer.from(buffer));

      console.log("Model downloaded and saved successfully.");
    }

    // TODO: if we're on a mac, execution provider is cpu, otherwise test for cuda

    const opt: ort.InferenceSession.SessionOptions = {
      executionProviders: ["cuda", "gpu", "cpu"],
      logSeverityLevel: 3,
      logVerbosityLevel: 3,
      enableCpuMemArena: false,
      enableMemPattern: false,
      enableProfiling: false,
      graphOptimizationLevel: "disabled",
    };
    let session: ort.InferenceSession;

    if (typeof window === "undefined") {
      // Only read in the model file in NodeJS.
      const model = fs.readFileSync(uri);

      session = await ort.InferenceSession.create(model, opt);
    } else {
      session = await ort.InferenceSession.create(uri, opt);
    }

    return new SpeechService(session);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async synthesize(text: string): Promise<any> {
    // Preformat text to remove random things like whitespace.
    const cleanedText = phonemeCleaner(text);
    console.log("Cleaned Text:" + cleanedText);

    // Convert text to phenomes using espeak-ng bindings.
    const phenomes = await this.phenomizer.phonemize(cleanedText);
    console.log("Phenomes:" + phenomes);

    // Convert phonemes to tokens using our vits tokenizer.
    const tokens = this.tokenizer.tokenize(phenomes);
    console.log("Tokens:" + tokens);

    // Add blank characters throughout our input tokens to make sure
    // the speed of our speech is correct.
    const paddedTokens = this.tokenizer.intersperseBlankChar(
      tokens.map(String),
    );
    console.log("Padded Tokens:" + paddedTokens);

    const x = new ort.Tensor("int64", paddedTokens, [1, paddedTokens.length]);
    const x_length = new ort.Tensor("int64", [x.dims[1]]);
    const noiseScale = 0.667;
    const lengthScale = 1.0;
    const noiseScaleDP = 0.8;

    const scales = new ort.Tensor(
      "float32",
      new Float32Array([noiseScale, lengthScale, noiseScaleDP]),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: Record<string, any> = {
      input: x,
      input_lengths: x_length,
      scales: scales,
    };

    const output = await this.session.run(input, {});

    return output.output.data;
  }
}

export { SpeechService };
