import ort from "onnxruntime-node";
import Debug, { Debugger } from "debug";
import ESpeakNg from "espeak-ng";
import * as fs from "fs";
import path from "path";

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
            "g"
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
            "g"
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

        let puncs: PuncIndex[] = [];
        let splitText: string[] = [];
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
        num: number
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
                    num
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
                    num
                );
        }
    }
}
type Vocabulary = { [character: string]: number };

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
        blank: string = "<BLNK>"
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
            if (!vocab.hasOwnProperty(char)) {
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
        ipaCharacters: string = ""
    ) {
        // Concatenate graphemes and IPA characters if IPA characters are provided
        if (ipaCharacters) {
            graphemes += ipaCharacters;
        }

        // Call the super constructor of TextTokenizer
        super(graphemes, punctuations, pad, undefined, undefined, "<BLNK>");
    }

    public intersperseBlankChar(charSequence): Array<string> {
        const charToUse = this.blank
            ? this.vocab[this.blank] + 1
            : this.vocab[this.pad];
        let result = new Array(charSequence.length * 2 + 1).fill(charToUse);
        for (let i = 0; i < charSequence.length; i++) {
            result[i * 2 + 1] = charSequence[i];
        }
        return result;
    }

    protected createVocab(): Vocabulary {
        const vocab: Vocabulary = {};

        // Add pad and punctuations to vocab
        [this.pad, ...this.punctuations, ...this.characters, this.blank].forEach(
            (symbol) => {
                if (symbol && !vocab.hasOwnProperty(symbol)) {
                    vocab[symbol] = Object.keys(vocab).length;
                }
            }
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
    // TODO: Implement missing number normalization: https://github.com/ianmarmour/speech-synthesizer/issues/1
    // TODO: Implement missing abbreviation expansion: https://github.com/ianmarmour/speech-synthesizer/issues/2
    text = replaceSymbols(text);
    text = removeAuxSymbols(text);
    text = collapseWhitespace(text);

    return text;
};
class SpeechSynthesizer {
    private debugger: Debugger;
    private tokenizer: VitsTokenizer;
    private phenomizer: EspeakPhonemizer;
    private session: ort.InferenceSession;

    private constructor(session: ort.InferenceSession) {
        this.session = session;
        this.phenomizer = new EspeakPhonemizer("en-us");
        this.tokenizer = new VitsTokenizer(
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            ';:,.!?¡¿—…"«»“” ',
            "_",
            "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ"
        );
        this.debugger = Debug("speech-synthesizer");
    }

    static async create(uri: string = "./model.onnx") {
        // check if model.onnx exists
        if (!fs.existsSync(uri)) {
            console.log("Model file does not exist, downloading...");
            const response = await fetch("https://media.githubusercontent.com/media/ianmarmour/speech-synthesizer/main/model/vits.onnx?download=true");
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(uri, Buffer.from(buffer));
    
            console.log("Model downloaded and saved successfully.");
        }

        // TODO: if we're on a mac, execution provider is cpu, otherwise test for cuda

        const opt: ort.InferenceSession.SessionOptions = {
            executionProviders: ["cuda", "cpu"],
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

        return new SpeechSynthesizer(session);
    }

    async synthesize(text: string): Promise<any> {
        // Preformat text to remove random things like whitespace.
        const cleanedText = phonemeCleaner(text);
        this.debugger("Cleaned Text:" + cleanedText);

        // Convert text to phenomes using espeak-ng bindings.
        const phenomes = await this.phenomizer.phonemize(cleanedText);
        this.debugger("Phenomes:" + phenomes);

        // Convert phonemes to tokens using our vits tokenizer.
        const tokens = this.tokenizer.tokenize(phenomes);
        this.debugger("Tokens:" + tokens);

        // Add blank characters throughout our input tokens to make sure
        // the speed of our speech is correct.
        const paddedTokens = this.tokenizer.intersperseBlankChar(tokens);
        this.debugger("Padded Tokens:" + paddedTokens);

        const x = new ort.Tensor("int64", paddedTokens, [1, paddedTokens.length]);
        const x_length = new ort.Tensor("int64", [x.dims[1]]);
        const noiseScale = 0.667;
        const lengthScale = 1.0;
        const noiseScaleDP = 0.8;

        const scales = new ort.Tensor(
            "float32",
            new Float32Array([noiseScale, lengthScale, noiseScaleDP])
        );

        const input: Record<string, any> = {
            input: x,
            input_lengths: x_length,
            scales: scales,
        };

        const output = await this.session.run(input, {});

        return output.output.data;
    }
}

export { SpeechSynthesizer };