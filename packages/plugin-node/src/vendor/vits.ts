// VITS implementation, extracted from echogarden: https://github.com/echogarden-project/echogarden
// We had some compatibility issues with the package, so we brought this code in directly
// This code is licensed under the GPL license

import * as AlawMulaw from "alawmulaw";
import { spawn } from "child_process";
import * as CldrSegmentation from "cldr-segmentation";
import commandExists from "command-exists";
import { randomBytes } from "crypto";
import * as fsExtra from "fs-extra";
import { GaxiosOptions, request } from "gaxios";
import gracefulFS from "graceful-fs";
import { convert as convertHtmlToText } from "html-to-text";
import * as Onnx from "onnxruntime-node";
import os from "os";
import path from "path";
import { detectAll } from "tinyld";
import { fileURLToPath } from "url";
import { inspect, promisify } from "util";
import { vitsVoiceList } from "./vitsVoiceList.ts";

export async function synthesize(
    input: string | string[],
    options: SynthesisOptions,
    onSegment?: SynthesisSegmentEvent,
    onSentence?: SynthesisSegmentEvent
): Promise<SynthesisResult> {
    options = extendDeep(defaultSynthesisOptions, options);

    let segments: string[];

    if (Array.isArray(input)) {
        segments = input;
    } else {
        const plainTextOptions = options.plainText!;

        segments = splitToParagraphs(
            input,
            plainTextOptions.paragraphBreaks!,
            plainTextOptions.whitespace!
        );
    }

    return await synthesizeSegments(segments, options, onSegment, onSentence);
}

const createWriteStream = gracefulFS.createWriteStream;

function getCostMatrixMemorySizeMB(
    sequence1Length: number,
    sequence2Length: number,
    windowLength: number
) {
    const costMatrixMemorySizeMB =
        (sequence1Length * Math.min(sequence2Length, windowLength) * 4) /
        1000000;

    return costMatrixMemorySizeMB;
}

function argIndexOfMinimumOf3(x1: number, x2: number, x3: number) {
    if (x1 <= x2 && x1 <= x3) {
        return 1;
    } else if (x2 <= x3) {
        return 2;
    } else {
        return 3;
    }
}

function minimumOf3(x1: number, x2: number, x3: number) {
    if (x1 <= x2 && x1 <= x3) {
        return x1;
    } else if (x2 <= x3) {
        return x2;
    } else {
        return x3;
    }
}

function computeAccumulatedCostMatrixTransposed<T, U>(
    sequence1: T[],
    sequence2: U[],
    costFunction: (a: T, b: U) => number,
    windowMaxLength: number,
    centerIndexes?: number[]
) {
    const halfWindowMaxLength = Math.floor(windowMaxLength / 2);

    const columnCount = sequence1.length;
    const rowCount = Math.min(windowMaxLength, sequence2.length);

    const accumulatedCostMatrixTransposed: Float32Array[] =
        new Array<Float32Array>(columnCount);

    // Initialize an array to store window start offsets
    const windowStartOffsets = new Int32Array(columnCount);

    // Compute accumulated cost matrix column by column
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        // Create new column and add it to the matrix
        const currentColumn = new Float32Array(rowCount);
        accumulatedCostMatrixTransposed[columnIndex] = currentColumn;

        // Compute window center, or use given one
        let windowCenter: number;

        if (centerIndexes) {
            windowCenter = centerIndexes[columnIndex];
        } else {
            windowCenter = Math.floor(
                (columnIndex / columnCount) * sequence2.length
            );
        }

        // Compute window start and end offsets
        let windowStartOffset = Math.max(windowCenter - halfWindowMaxLength, 0);
        let windowEndOffset = windowStartOffset + rowCount;

        if (windowEndOffset > sequence2.length) {
            windowEndOffset = sequence2.length;
            windowStartOffset = windowEndOffset - rowCount;
        }

        // Store the start offset for this column
        windowStartOffsets[columnIndex] = windowStartOffset;

        // Get target sequence1 value
        const targetSequence1Value = sequence1[columnIndex];

        // If this is the first column, fill it only using the 'up' neighbors
        if (columnIndex == 0) {
            for (let rowIndex = 1; rowIndex < rowCount; rowIndex++) {
                const cost = costFunction(
                    targetSequence1Value,
                    sequence2[windowStartOffset + rowIndex]
                );
                const upCost = currentColumn[rowIndex - 1];

                currentColumn[rowIndex] = cost + upCost;
            }

            continue;
        }

        // If not first column

        // Store the column to the left
        const leftColumn = accumulatedCostMatrixTransposed[columnIndex - 1];

        // Compute the delta between the current window start offset
        // and left column's window offset
        const windowOffsetDelta =
            windowStartOffset - windowStartOffsets[columnIndex - 1];

        // Compute the accumulated cost for all rows in the window
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            // Compute the cost for current cell
            const cost = costFunction(
                targetSequence1Value,
                sequence2[windowStartOffset + rowIndex]
            );

            // Retrieve the cost for the 'up' (insertion) neighbor
            let upCost = Infinity;
            if (rowIndex > 0) {
                upCost = currentColumn[rowIndex - 1];
            }

            // Retrieve the cost for the 'left' (deletion) neighbor
            let leftCost = Infinity;
            const leftRowIndex = rowIndex + windowOffsetDelta;

            if (leftRowIndex < rowCount) {
                leftCost = leftColumn[leftRowIndex];
            }

            // Retrieve the cost for the 'up and left' (match) neighbor
            let upAndLeftCost = Infinity;
            const upAndLeftRowIndex = leftRowIndex - 1;

            if (upAndLeftRowIndex >= 0 && upAndLeftRowIndex < rowCount) {
                upAndLeftCost = leftColumn[upAndLeftRowIndex];
            }

            // Find the minimum of all neighbors
            let minimumNeighborCost = minimumOf3(
                upCost,
                leftCost,
                upAndLeftCost
            );

            // If all neighbors are infinity, then it means there is a "jump" between the window
            // of the current column and the left column, and they don't have overlapping rows.
            // In this case, only the cost of the current cell will be used
            if (minimumNeighborCost === Infinity) {
                minimumNeighborCost = 0;
            }

            // Write cost + minimum neighbor cost to the current column
            currentColumn[rowIndex] = cost + minimumNeighborCost;
        }
    }

    return {
        accumulatedCostMatrixTransposed,
        windowStartOffsets,
    };
}

function computeBestPathTransposed(
    accumulatedCostMatrixTransposed: Float32Array[],
    windowStartOffsets: Int32Array
) {
    const columnCount = accumulatedCostMatrixTransposed.length;
    const rowCount = accumulatedCostMatrixTransposed[0].length;

    const bestPath: AlignmentPath = [];

    // Start at the bottom right corner and find the best path
    // towards the top left
    let columnIndex = columnCount - 1;
    let rowIndex = rowCount - 1;

    while (columnIndex > 0 || rowIndex > 0) {
        const windowStartIndex = windowStartOffsets[columnIndex];
        const windowStartDelta =
            columnIndex > 0
                ? windowStartIndex - windowStartOffsets[columnIndex - 1]
                : 0;

        // Add the current cell to the best path
        bestPath.push({
            source: columnIndex,
            dest: windowStartIndex + rowIndex,
        });

        // Retrieve the cost for the 'up' (insertion) neighbor
        const upRowIndex = rowIndex - 1;
        let upCost = Infinity;

        if (upRowIndex >= 0) {
            upCost = accumulatedCostMatrixTransposed[columnIndex][upRowIndex];
        }

        // Retrieve the cost for the 'left' (deletion) neighbor
        const leftRowIndex = rowIndex + windowStartDelta;
        const leftColumnIndex = columnIndex - 1;
        let leftCost = Infinity;

        if (leftColumnIndex >= 0 && leftRowIndex < rowCount) {
            leftCost =
                accumulatedCostMatrixTransposed[leftColumnIndex][leftRowIndex];
        }

        // Retrieve the cost for the 'up and left' (match) neighbor
        const upAndLeftRowIndex = rowIndex - 1 + windowStartDelta;
        const upAndLeftColumnIndex = columnIndex - 1;
        let upAndLeftCost = Infinity;

        if (
            upAndLeftColumnIndex >= 0 &&
            upAndLeftRowIndex >= 0 &&
            upAndLeftRowIndex < rowCount
        ) {
            upAndLeftCost =
                accumulatedCostMatrixTransposed[upAndLeftColumnIndex][
                    upAndLeftRowIndex
                ];
        }

        // If all neighbors have a cost of infinity, it means
        // there is a "jump" between the window for the current and previous column
        if (
            upCost == Infinity &&
            leftCost == Infinity &&
            upAndLeftCost == Infinity
        ) {
            // In that case:
            //
            // If there are rows above
            if (upRowIndex >= 0) {
                // Move upward
                rowIndex = upRowIndex;
            } else if (leftColumnIndex >= 0) {
                // Otherwise, move to the left
                columnIndex = leftColumnIndex;
            } else {
                // Since we know that either columnIndex > 0 or rowIndex > 0,
                // one of these directions must be available.
                // This error should never happen

                throw new Error(
                    `Unexpected state: columnIndex: ${columnIndex}, rowIndex: ${rowIndex}`
                );
            }
        } else {
            // Choose the direction with the smallest cost
            const smallestCostDirection = argIndexOfMinimumOf3(
                upCost,
                leftCost,
                upAndLeftCost
            );

            if (smallestCostDirection == 1) {
                // Move upward
                rowIndex = upRowIndex;
                // The upper column index stays the same
            } else if (smallestCostDirection == 2) {
                // Move to the left
                rowIndex = leftRowIndex;
                columnIndex = leftColumnIndex;
            } else {
                // Move upward and to the left
                rowIndex = upAndLeftRowIndex;
                columnIndex = upAndLeftColumnIndex;
            }
        }
    }

    bestPath.push({
        source: 0,
        dest: 0,
    });

    return bestPath.reverse() as AlignmentPath;
}

function alignDTWWindowed<T, U>(
    sequence1: T[],
    sequence2: U[],
    costFunction: (a: T, b: U) => number,
    windowMaxLength: number,
    centerIndexes?: number[]
) {
    if (windowMaxLength < 2) {
        throw new Error("Window length must be greater or equal to 2");
    }

    if (sequence1.length == 0 || sequence2.length == 0) {
        return {
            path: [] as AlignmentPath,
            pathCost: 0,
        };
    }

    // Compute accumulated cost matrix (transposed)
    const { accumulatedCostMatrixTransposed, windowStartOffsets } =
        computeAccumulatedCostMatrixTransposed(
            sequence1,
            sequence2,
            costFunction,
            windowMaxLength,
            centerIndexes
        );

    // Find best path for the computed matrix
    const path = computeBestPathTransposed(
        accumulatedCostMatrixTransposed,
        windowStartOffsets
    );

    // Best path cost is the bottom right element of the matrix
    const columnCount = accumulatedCostMatrixTransposed.length;
    const rowCount = accumulatedCostMatrixTransposed[0].length;

    const pathCost =
        accumulatedCostMatrixTransposed[columnCount - 1][rowCount - 1];

    // Return
    return { path, pathCost };
}

async function alignMFCC_DTW(
    mfccFrames1: number[][],
    mfccFrames2: number[][],
    windowLength: number,
    distanceFunctionKind: "euclidian" | "cosine" = "euclidian",
    centerIndexes?: number[]
) {
    if (distanceFunctionKind == "euclidian") {
        let distanceFunction = euclidianDistance;

        if (mfccFrames1.length > 0 && mfccFrames1[0].length === 13) {
            distanceFunction = euclidianDistance13Dim;
        }

        const { path } = alignDTWWindowed(
            mfccFrames1,
            mfccFrames2,
            distanceFunction,
            windowLength,
            centerIndexes
        );

        return path;
    } else if (distanceFunctionKind == "cosine") {
        const indexes1 = createVectorForIntegerRange(0, mfccFrames1.length);
        const indexes2 = createVectorForIntegerRange(0, mfccFrames2.length);

        const magnitudes1 = mfccFrames1.map(magnitude);
        const magnitudes2 = mfccFrames2.map(magnitude);

        const { path } = alignDTWWindowed(
            indexes1,
            indexes2,
            (i, j) =>
                cosineDistancePrecomputedMagnitudes(
                    mfccFrames1[i],
                    mfccFrames2[j],
                    magnitudes1[i],
                    magnitudes2[j]
                ),
            windowLength,
            centerIndexes
        );

        return path;
    } else {
        throw new Error("Invalid distance function");
    }
}

let kissFFTInstance: any;

type WindowType = "hann" | "hamming" | "povey";

function getBinFrequencies(binCount: number, maxFrequency: number) {
    const binFrequencies = new Float32Array(binCount);
    const frequencyStep = maxFrequency / (binCount - 1);

    for (
        let i = 0, frequency = 0;
        i < binFrequencies.length;
        i++, frequency += frequencyStep
    ) {
        binFrequencies[i] = frequency;
    }

    return binFrequencies;
}

function fftFrameToPowerSpectrum(fftFrame: Float32Array) {
    const powerSpectrum = new Float32Array(fftFrame.length / 2);

    for (let i = 0; i < powerSpectrum.length; i++) {
        const binOffset = i * 2;
        const fftCoefficientRealPart = fftFrame[binOffset];
        const fftCoefficientImaginaryPart = fftFrame[binOffset + 1];
        const binPower =
            fftCoefficientRealPart ** 2 + fftCoefficientImaginaryPart ** 2;

        powerSpectrum[i] = binPower;
    }

    return powerSpectrum;
}

async function getKissFFTInstance() {
    if (!kissFFTInstance) {
        const { default: initializer } = await import(
            "@echogarden/kissfft-wasm"
        );

        kissFFTInstance = await initializer();
    }

    return kissFFTInstance;
}

function getWindowWeights(windowType: WindowType, windowSize: number) {
    const weights = new Float32Array(windowSize);

    const innerFactor = (2 * Math.PI) / (windowSize - 1);

    if (windowType == "hann") {
        for (let i = 0; i < windowSize; i++) {
            //weights[i] = 0.5 * (1 - Math.cos(2 * Math.PI * (i / (windowSize - 1))))
            weights[i] = 0.5 * (1 - Math.cos(innerFactor * i));
        }
    } else if (windowType == "hamming") {
        for (let i = 0; i < windowSize; i++) {
            //weights[i] = 0.54 - (0.46 * Math.cos(2 * Math.PI * (i / (windowSize - 1))))
            weights[i] = 0.54 - 0.46 * Math.cos(innerFactor * i);
        }
    } else if (windowType == "povey") {
        const hannWeights = getWindowWeights("hann", windowSize);

        for (let i = 0; i < windowSize; i++) {
            weights[i] = hannWeights[i] ** 0.85;
        }
    } else {
        throw new Error(`Unsupported window function type: ${windowType}`);
    }

    return weights;
}

async function stftr(
    samples: Float32Array,
    fftOrder: number,
    windowSize: number,
    hopSize: number,
    windowType: WindowType
) {
    if (fftOrder % 2 != 0 || windowSize % 2 != 0) {
        throw new Error("FFT order and window size must multiples of 2");
    }

    if (windowSize > fftOrder) {
        throw new Error("Window size must be lesser or equal to the FFT size");
    }

    if (hopSize > windowSize) {
        throw new Error("Hop size must be lesser or equal to the window size");
    }

    const halfWindowSize = windowSize / 2;

    const padding = new Float32Array(halfWindowSize);
    samples = concatFloat32Arrays([padding, samples, padding]);

    const windowWeights = getWindowWeights(windowType, windowSize);

    const m = await getKissFFTInstance();
    const wasmMemory = new WasmMemoryManager(m);

    const statePtr = m._kiss_fftr_alloc(fftOrder, 0, 0, 0);
    wasmMemory.wrapPointer(statePtr);

    const sampleCount = samples.length;
    const frameBufferRef = wasmMemory.allocFloat32Array(fftOrder);
    const binsBufferRef = wasmMemory.allocFloat32Array(fftOrder * 2);

    const frames: Float32Array[] = [];

    for (let offset = 0; offset < sampleCount; offset += hopSize) {
        const windowSamples = samples.subarray(offset, offset + windowSize);
        frameBufferRef.clear();

        const frameBufferView = frameBufferRef.view;

        for (let i = 0; i < windowSamples.length; i++) {
            frameBufferView[i] = windowSamples[i] * windowWeights[i];
        }

        binsBufferRef.clear();

        m._kiss_fftr(statePtr, frameBufferRef.address, binsBufferRef.address);

        const bins = binsBufferRef.view.slice(0, fftOrder + 2);
        frames.push(bins);
    }

    wasmMemory.freeAll();

    return frames;
}

async function computeMelSpectogramUsingFilterbanks(
    rawAudio: RawAudio,
    fftOrder: number,
    windowSize: number,
    hopLength: number,
    filterbanks: Filterbank[],
    windowType: WindowType = "hann"
) {
    const logger = new Logger();

    logger.start("Compute short-time FFTs");
    const audioSamples = rawAudio.audioChannels[0];
    const fftFrames = await stftr(
        audioSamples,
        fftOrder,
        windowSize,
        hopLength,
        windowType
    );

    logger.start("Convert FFT frames to a mel spectogram");
    const melSpectogram = fftFramesToMelSpectogram(fftFrames, filterbanks);

    logger.end();

    return { melSpectogram, fftFrames };
}

function fftFramesToMelSpectogram(
    fftFrames: Float32Array[],
    melFilterbanks: Filterbank[]
) {
    return fftFrames.map((fftFrame) => {
        const powerSpectrum = fftFrameToPowerSpectrum(fftFrame);
        return powerSpectrumToMelSpectrum(powerSpectrum, melFilterbanks);
    });
}

function powerSpectrumToMelSpectrum(
    powerSpectrum: Float32Array,
    filterbanks: Filterbank[]
) {
    const filterbankCount = filterbanks.length;
    const melSpectrum = new Float32Array(filterbankCount);

    for (let melBandIndex = 0; melBandIndex < filterbankCount; melBandIndex++) {
        const filterbank = filterbanks[melBandIndex];
        const filterbankStartIndex = filterbank.startIndex;
        const filterbankWeights = filterbank.weights;

        if (filterbankStartIndex === -1) {
            continue;
        }

        let melBandValue = 0;

        for (let i = 0; i < filterbankWeights.length; i++) {
            const powerSpectrumIndex = filterbankStartIndex + i;

            if (powerSpectrumIndex >= powerSpectrum.length) {
                break;
            }

            const weight = filterbankWeights[i];
            const powerSpectrumValue = powerSpectrum[powerSpectrumIndex];

            melBandValue += weight * powerSpectrumValue;
        }

        melSpectrum[melBandIndex] = melBandValue;
    }

    return melSpectrum;
}

function getMelFilterbanks(
    powerSpectrumFrequenciesHz: Float32Array,
    centerFrequenciesMel: Float32Array,
    lowerFrequencyMel: number,
    upperFrequencyMel: number
) {
    const filterbankCount = centerFrequenciesMel.length;
    const powerSpectrumFrequenciesMel = powerSpectrumFrequenciesHz.map(
        (frequencyHz) => hertzToMel(frequencyHz)
    );

    const filterbanks: Filterbank[] = [];

    for (
        let filterbankIndex = 0;
        filterbankIndex < filterbankCount;
        filterbankIndex++
    ) {
        const centerFrequency = centerFrequenciesMel[filterbankIndex];

        const leftFrequency =
            filterbankIndex > 0
                ? centerFrequenciesMel[filterbankIndex - 1]
                : lowerFrequencyMel;
        const rightFrequency =
            filterbankIndex < filterbankCount - 1
                ? centerFrequenciesMel[filterbankIndex + 1]
                : upperFrequencyMel;

        const width = rightFrequency - leftFrequency;
        const halfWidth = width / 2;

        let startIndex = -1;
        let weights: number[] = [];

        let weightSum = 0;

        for (
            let powerSpectrumBandIndex = 0;
            powerSpectrumBandIndex < powerSpectrumFrequenciesMel.length;
            powerSpectrumBandIndex++
        ) {
            const powerSpectrumBandFrequencyMel =
                powerSpectrumFrequenciesMel[powerSpectrumBandIndex];

            let weight = 0;

            if (
                powerSpectrumBandFrequencyMel >= leftFrequency &&
                powerSpectrumBandFrequencyMel <= centerFrequency
            ) {
                weight =
                    (powerSpectrumBandFrequencyMel - leftFrequency) / halfWidth;
            } else if (
                powerSpectrumBandFrequencyMel > centerFrequency &&
                powerSpectrumBandFrequencyMel <= rightFrequency
            ) {
                weight =
                    (rightFrequency - powerSpectrumBandFrequencyMel) /
                    halfWidth;
            }

            if (weight > 0) {
                if (startIndex == -1) {
                    startIndex = powerSpectrumBandIndex;
                }

                weights.push(weight);
                weightSum += weight;
            } else if (startIndex != -1) {
                break;
            }
        }

        weights = weights.map((weight) => weight / weightSum);

        filterbanks.push({ startIndex, weights });
    }

    return filterbanks;
}

function getMelFilterbanksCenterFrequencies(
    melBandCount: number,
    lowerFrequencyMel: number,
    upperFrequencyMel: number
) {
    const stepSizeMel =
        (upperFrequencyMel - lowerFrequencyMel) / (melBandCount + 1);

    const centerFrequencies = new Float32Array(melBandCount);

    for (let i = 0; i < melBandCount; i++) {
        centerFrequencies[i] = lowerFrequencyMel + (i + 1) * stepSizeMel;
    }

    return centerFrequencies;
}

function hertzToMel(frequency: number) {
    return 2595.0 * Math.log10(1.0 + frequency / 700.0);
}

type Filterbank = {
    startIndex: number;
    weights: number[];
};

async function computeMelSpectogram(
    rawAudio: RawAudio,
    fftOrder: number,
    windowSize: number,
    hopLength: number,
    filterbankCount: number,
    lowerFrequencyHz: number,
    upperFrequencyHz: number,
    windowType: WindowType = "hann"
) {
    const logger = new Logger();

    logger.start("Compute mel filterbank");
    const binCount = fftOrder / 2 + 2;
    const nyquistFrequency = rawAudio.sampleRate / 2;
    const binFrequencies = getBinFrequencies(binCount, nyquistFrequency);

    const lowerFrequencyMel = hertzToMel(lowerFrequencyHz);
    const upperFrequencyMel = hertzToMel(upperFrequencyHz);

    const filterbanksCenterFrequencies = getMelFilterbanksCenterFrequencies(
        filterbankCount,
        lowerFrequencyMel,
        upperFrequencyMel
    );
    const melFilterbanks = getMelFilterbanks(
        binFrequencies,
        filterbanksCenterFrequencies,
        lowerFrequencyMel,
        upperFrequencyMel
    );

    logger.end();

    return computeMelSpectogramUsingFilterbanks(
        rawAudio,
        fftOrder,
        windowSize,
        hopLength,
        melFilterbanks,
        windowType
    );
}

function powerToDecibels(power: number) {
    return power <= 0.0000000001 ? -100 : 10.0 * Math.log10(power);
}

function melSpectrumToMFCC(
    melSpectrum: Float32Array,
    mfccFeatureCount: number,
    dctMatrix: Float32Array[],
    normalization: "none" | "orthonormal" = "orthonormal"
) {
    const melBandCount = melSpectrum.length;

    let firstFeatureNormalizationFactor: number;
    let nonfirstFeatureNormalizationFactor: number;

    if (normalization == "orthonormal") {
        firstFeatureNormalizationFactor = Math.sqrt(1 / (4 * mfccFeatureCount));
        nonfirstFeatureNormalizationFactor = Math.sqrt(
            1 / (2 * mfccFeatureCount)
        );
    } else {
        firstFeatureNormalizationFactor = 1;
        nonfirstFeatureNormalizationFactor = 1;
    }

    const mfcc = new Float32Array(mfccFeatureCount);

    for (
        let mfccFeatureIndex = 0;
        mfccFeatureIndex < mfccFeatureCount;
        mfccFeatureIndex++
    ) {
        const dctMatrixRow = dctMatrix[mfccFeatureIndex];

        let sum = 0;

        for (let j = 0; j < melBandCount; j++) {
            const dctCoefficient = dctMatrixRow[j];
            const logMel = powerToDecibels(melSpectrum[j]);
            //const logMel = Math.log(1e-40 + melSpectrum[j])

            sum += dctCoefficient * logMel;
        }

        const normalizationFactor =
            mfccFeatureIndex == 0
                ? firstFeatureNormalizationFactor
                : nonfirstFeatureNormalizationFactor;

        //mfcc[mfccFeatureIndex] = normalizationFactor * sum
        mfcc[mfccFeatureIndex] = normalizationFactor * 2 * sum; // Sum multiplied by 2 to match with librosa
    }

    return mfcc;
}

function createDCTType2CoefficientMatrix(
    mfccFeatureCount: number,
    melBandCount: number
) {
    const dctMatrix = new Array<Float32Array>(mfccFeatureCount);

    for (
        let mfccFeatureIndex = 0;
        mfccFeatureIndex < mfccFeatureCount;
        mfccFeatureIndex++
    ) {
        const row = new Float32Array(melBandCount);

        const innerMultiplier = (Math.PI * mfccFeatureIndex) / melBandCount;

        for (
            let melBandIndex = 0;
            melBandIndex < melBandCount;
            melBandIndex++
        ) {
            row[melBandIndex] = Math.cos(
                innerMultiplier * (melBandIndex + 0.5)
            );
        }

        dctMatrix[mfccFeatureIndex] = row;
    }

    return dctMatrix;
}

function melSpectogramToMFCCs(
    melSpectogram: Float32Array[],
    mfccFeatureCount: number
) {
    const melBandCount = melSpectogram[0].length;
    const dctMatrix = createDCTType2CoefficientMatrix(
        mfccFeatureCount,
        melBandCount
    );

    const mfccs = melSpectogram.map((frame) =>
        melSpectrumToMFCC(frame, mfccFeatureCount, dctMatrix)
    );

    return mfccs;
}

function applyEmphasis(
    samples: Float32Array,
    emphasisFactor = 0.97,
    initialState = 0
) {
    const processedSamples = new Float32Array(samples.length);

    processedSamples[0] = samples[0] - emphasisFactor * initialState;

    for (let i = 1; i < processedSamples.length; i++) {
        processedSamples[i] = samples[i] - emphasisFactor * samples[i - 1];
    }

    return processedSamples;
}

function cloneRawAudio(rawAudio: RawAudio): RawAudio {
    return {
        audioChannels: rawAudio.audioChannels.map((channel) => channel.slice()),
        sampleRate: rawAudio.sampleRate,
    };
}

let speexResamplerInstance: any;

async function resampleAudioSpeex(
    rawAudio: RawAudio,
    outSampleRate: number,
    quality = 0
): Promise<RawAudio> {
    const channelCount = rawAudio.audioChannels.length;
    const inSampleRate = rawAudio.sampleRate;

    const totalSampleCount = rawAudio.audioChannels[0].length;
    const sampleRateRatio = outSampleRate / inSampleRate;

    if (inSampleRate === outSampleRate) {
        return cloneRawAudio(rawAudio);
    }

    if (totalSampleCount === 0) {
        return {
            ...cloneRawAudio(rawAudio),
            sampleRate: outSampleRate,
        } as RawAudio;
    }

    const m = await getSpeexResamplerInstance();
    const wasmMemory = new WasmMemoryManager(m);

    function speexResultCodeToString(resultCode: number) {
        const errorStrPtr = m._speex_resampler_strerror(resultCode);
        const errorStrRef = wasmMemory.wrapUint8Array(errorStrPtr, 1024);
        const message = errorStrRef.readAsNullTerminatedUtf8String();

        return message;
    }

    const initErrRef = wasmMemory.allocInt32();
    const resamplerStateAddress = m._speex_resampler_init(
        channelCount,
        inSampleRate,
        outSampleRate,
        quality,
        initErrRef.address
    );
    let resultCode = initErrRef.value;

    if (resultCode != 0) {
        throw new Error(
            `Speex resampler failed while initializing with code ${resultCode}: ${speexResultCodeToString(resultCode)}`
        );
    }

    const inputLatency = m._speex_resampler_get_input_latency(
        resamplerStateAddress
    );
    const outputLatency = m._speex_resampler_get_output_latency(
        resamplerStateAddress
    );

    const maxChunkSize = 2 ** 20;

    const inputChunkSampleCountRef = wasmMemory.allocInt32();
    const outputChunkSampleCountRef = wasmMemory.allocInt32();

    const inputChunkSamplesRef = wasmMemory.allocFloat32Array(maxChunkSize * 2);
    const outputChunkSamplesRef = wasmMemory.allocFloat32Array(
        Math.floor(maxChunkSize * sampleRateRatio) * 2
    );

    const resampledAudioChunksForChannels: Float32Array[][] = [];

    for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
        resampledAudioChunksForChannels.push([]);
    }

    for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
        for (let readOffset = 0; readOffset < totalSampleCount; ) {
            const isLastChunk = readOffset + maxChunkSize >= totalSampleCount;

            const inputPaddingSize = isLastChunk ? inputLatency : 0;
            const maxSamplesToRead =
                Math.min(maxChunkSize, totalSampleCount - readOffset) +
                inputPaddingSize;

            const maxSamplesToWrite = outputChunkSamplesRef.length;

            const inputChunkSamplesForChannel = rawAudio.audioChannels[
                channelIndex
            ].slice(readOffset, readOffset + maxSamplesToRead);

            inputChunkSampleCountRef.value = maxSamplesToRead;
            outputChunkSampleCountRef.value = maxSamplesToWrite;

            inputChunkSamplesRef.view.set(inputChunkSamplesForChannel);
            resultCode = m._speex_resampler_process_float(
                resamplerStateAddress,
                channelIndex,
                inputChunkSamplesRef.address,
                inputChunkSampleCountRef.address,
                outputChunkSamplesRef.address,
                outputChunkSampleCountRef.address
            );

            if (resultCode != 0) {
                throw new Error(
                    `Speex resampler failed while resampling with code ${resultCode}: ${speexResultCodeToString(resultCode)}`
                );
            }

            const samplesReadCount = inputChunkSampleCountRef.value;
            const samplesWrittenCount = outputChunkSampleCountRef.value;

            const resampledChannelAudio = outputChunkSamplesRef.view.slice(
                0,
                samplesWrittenCount
            );

            resampledAudioChunksForChannels[channelIndex].push(
                resampledChannelAudio
            );

            readOffset += samplesReadCount;
        }
    }

    m._speex_resampler_destroy(resamplerStateAddress);
    wasmMemory.freeAll();

    const resampledAudio: RawAudio = {
        audioChannels: [],
        sampleRate: outSampleRate,
    };

    for (let i = 0; i < channelCount; i++) {
        resampledAudioChunksForChannels[i][0] =
            resampledAudioChunksForChannels[i][0].slice(outputLatency);

        resampledAudio.audioChannels.push(
            concatFloat32Arrays(resampledAudioChunksForChannels[i])
        );
    }

    return resampledAudio;
}

async function getSpeexResamplerInstance() {
    if (!speexResamplerInstance) {
        const { default: SpeexResamplerInitializer } = await import(
            "@echogarden/speex-resampler-wasm"
        );

        speexResamplerInstance = await SpeexResamplerInitializer();
    }

    return speexResamplerInstance;
}

function clip(num: number, min: number, max: number) {
    return Math.max(min, Math.min(max, num));
}
function normalizeVectors(
    vectors: number[][],
    kind: "population" | "sample" = "population"
) {
    const vectorCount = vectors.length;

    if (vectorCount == 0) {
        return { normalizedVectors: [], mean: [], stdDeviation: [] };
    }

    const featureCount = vectors[0].length;

    const mean = meanOfVectors(vectors);
    const stdDeviation = stdDeviationOfVectors(vectors, kind, mean);

    const normalizedVectors: number[][] = [];

    for (const vector of vectors) {
        const normalizedVector = createVector(featureCount);

        for (
            let featureIndex = 0;
            featureIndex < featureCount;
            featureIndex++
        ) {
            normalizedVector[featureIndex] =
                (vector[featureIndex] - mean[featureIndex]) /
                stdDeviation[featureIndex];

            normalizedVector[featureIndex] = zeroIfNaN(
                normalizedVector[featureIndex]
            );
        }

        normalizedVectors.push(normalizedVector);
    }

    return { normalizedVectors, mean, stdDeviation };
}

function meanOfVectors(vectors: number[][]) {
    const vectorCount = vectors.length;

    if (vectorCount == 0) {
        return [];
    }

    const featureCount = vectors[0].length;

    const result = createVector(featureCount);

    for (const vector of vectors) {
        for (
            let featureIndex = 0;
            featureIndex < featureCount;
            featureIndex++
        ) {
            result[featureIndex] += vector[featureIndex];
        }
    }

    for (let featureIndex = 0; featureIndex < featureCount; featureIndex++) {
        result[featureIndex] /= vectorCount;
    }

    return result;
}

function stdDeviationOfVectors(
    vectors: number[][],
    kind: "population" | "sample" = "population",
    mean?: number[]
) {
    return varianceOfVectors(vectors, kind, mean).map((v) => Math.sqrt(v));
}

function varianceOfVectors(
    vectors: number[][],
    kind: "population" | "sample" = "population",
    mean?: number[]
) {
    const vectorCount = vectors.length;

    if (vectorCount == 0) {
        return [];
    }

    const sampleSizeMetric =
        kind == "population" || vectorCount == 1
            ? vectorCount
            : vectorCount - 1;
    const featureCount = vectors[0].length;

    if (!mean) {
        mean = meanOfVectors(vectors);
    }

    const result = createVector(featureCount);

    for (const vector of vectors) {
        for (let i = 0; i < featureCount; i++) {
            result[i] += (vector[i] - mean[i]) ** 2;
        }
    }

    for (let i = 0; i < featureCount; i++) {
        result[i] /= sampleSizeMetric;
    }

    return result;
}

function euclidianDistance(
    vector1: ArrayLike<number>,
    vector2: ArrayLike<number>
) {
    return Math.sqrt(squaredEuclidianDistance(vector1, vector2));
}

function squaredEuclidianDistance(
    vector1: ArrayLike<number>,
    vector2: ArrayLike<number>
) {
    if (vector1.length !== vector2.length) {
        throw new Error("Vectors are not the same length");
    }

    const elementCount = vector1.length;

    if (elementCount === 0) {
        return 0;
    }

    let sum = 0.0;

    for (let i = 0; i < elementCount; i++) {
        sum += (vector1[i] - vector2[i]) ** 2;
    }

    return sum;
}

function euclidianDistance13Dim(
    vector1: ArrayLike<number>,
    vector2: ArrayLike<number>
) {
    return Math.sqrt(squaredEuclidianDistance13Dim(vector1, vector2));
}

function squaredEuclidianDistance13Dim(
    vector1: ArrayLike<number>,
    vector2: ArrayLike<number>
) {
    // Assumes the input has 13 dimensions (optimized for 13-dimensional MFCC vectors)

    const result =
        (vector1[0] - vector2[0]) ** 2 +
        (vector1[1] - vector2[1]) ** 2 +
        (vector1[2] - vector2[2]) ** 2 +
        (vector1[3] - vector2[3]) ** 2 +
        (vector1[4] - vector2[4]) ** 2 +
        (vector1[5] - vector2[5]) ** 2 +
        (vector1[6] - vector2[6]) ** 2 +
        (vector1[7] - vector2[7]) ** 2 +
        (vector1[8] - vector2[8]) ** 2 +
        (vector1[9] - vector2[9]) ** 2 +
        (vector1[10] - vector2[10]) ** 2 +
        (vector1[11] - vector2[11]) ** 2 +
        (vector1[12] - vector2[12]) ** 2;

    return result;
}

function cosineDistancePrecomputedMagnitudes(
    vector1: ArrayLike<number>,
    vector2: ArrayLike<number>,
    magnitude1: number,
    magnitude2: number
) {
    return (
        1 -
        cosineSimilarityPrecomputedMagnitudes(
            vector1,
            vector2,
            magnitude1,
            magnitude2
        )
    );
}

function cosineSimilarityPrecomputedMagnitudes(
    vector1: ArrayLike<number>,
    vector2: ArrayLike<number>,
    magnitude1: number,
    magnitude2: number
) {
    if (vector1.length != vector2.length) {
        throw new Error("Vectors are not the same length");
    }

    if (vector1.length == 0) {
        return 0;
    }

    const featureCount = vector1.length;

    let dotProduct = 0.0;

    for (let i = 0; i < featureCount; i++) {
        dotProduct += vector1[i] * vector2[i];
    }

    let result = dotProduct / (magnitude1 * magnitude2 + 1e-40);

    result = zeroIfNaN(result);
    result = clip(result, -1.0, 1.0);

    return result;
}

function magnitude(vector: ArrayLike<number>) {
    const featureCount = vector.length;

    let squaredMagnitude = 0.0;

    for (let i = 0; i < featureCount; i++) {
        squaredMagnitude += vector[i] ** 2;
    }

    return Math.sqrt(squaredMagnitude);
}

function createVector(elementCount: number, initialValue = 0.0) {
    const result: number[] = new Array(elementCount);

    for (let i = 0; i < elementCount; i++) {
        result[i] = initialValue;
    }

    return result;
}

function createVectorForIntegerRange(start: number, end: number) {
    const newVector: number[] = [];

    for (let i = start; i < end; i++) {
        newVector.push(i);
    }

    return newVector;
}

function zeroIfNaN(val: number) {
    if (isNaN(val)) {
        return 0;
    } else {
        return val;
    }
}

type MfccOptions = {
    filterbankCount?: number;
    featureCount?: number;
    fftOrder?: number;
    lowerFreq?: number;
    upperFreq?: number;
    windowDuration?: number;
    hopDuration?: number;
    emphasisFactor?: number;
    analysisSampleRate?: number;
    lifteringFactor?: number;
    normalize?: boolean;
    zeroFirstCoefficient?: boolean;
};

const defaultMfccOptions: MfccOptions = {
    filterbankCount: 40,
    featureCount: 13,
    fftOrder: 512,
    lowerFreq: 133.3333,
    upperFreq: 6855.4976,
    windowDuration: 0.025,
    hopDuration: 0.01,
    emphasisFactor: 0.97,
    analysisSampleRate: 16000,
    lifteringFactor: 0,
    normalize: false,
    zeroFirstCoefficient: false,
};

function extendDefaultMfccOptions(options: MfccOptions) {
    return extendDeep(defaultMfccOptions, options);
}

function applyLiftering(mfccs: number[][], lifteringFactor: number) {
    const featureCount = mfccs[0].length;

    const lifterMultipliers = new Float32Array(featureCount);

    for (let i = 0; i < featureCount; i++) {
        lifterMultipliers[i] =
            1 +
            (lifteringFactor / 2) *
                Math.sin((Math.PI * (i + 1)) / lifteringFactor);
    }

    const lifteredMfccs: number[][] = [];

    for (const mfcc of mfccs) {
        const lifteredMfcc = new Array(featureCount);

        for (let i = 0; i < featureCount; i++) {
            lifteredMfcc[i] = mfcc[i] * lifterMultipliers[i];
        }

        lifteredMfccs.push(lifteredMfcc);
    }

    return lifteredMfccs;
}

function compactPath(path: AlignmentPath) {
    const compactedPath: CompactedPath = [];

    for (let i = 0; i < path.length; i++) {
        const pathEntry = path[i];

        if (compactedPath.length <= pathEntry.source) {
            compactedPath.push({ first: pathEntry.dest, last: pathEntry.dest });
        } else {
            compactedPath[compactedPath.length - 1].last = pathEntry.dest;
        }
    }

    return compactedPath;
}

async function computeMFCCs(monoAudio: RawAudio, options: MfccOptions = {}) {
    const logger = new Logger();
    logger.start("Initialize options");

    if (monoAudio.audioChannels.length != 1) {
        throw new Error("Audio must be mono");
    }

    options = extendDefaultMfccOptions(options);

    const analysisSampleRate = options.analysisSampleRate!;
    const featureCount = options.featureCount!;

    const fftOrder = options.fftOrder!;

    const windowDuration = options.windowDuration!;
    const windowSize = windowDuration * analysisSampleRate;
    const hopDuration = options.hopDuration!;
    const hopLength = hopDuration * analysisSampleRate;

    const filterbankCount = options.filterbankCount!;
    const lowerFrequencyHz = options.lowerFreq!;
    const upperFrequencyHz = options.upperFreq!;

    const emphasisFactor = options.emphasisFactor!;
    const lifteringFactor = options.lifteringFactor!;
    const zeroFirstCoefficient = options.zeroFirstCoefficient!;

    logger.start(
        `Resample audio to analysis sample rate (${analysisSampleRate}Hz)`
    );
    const resampledAudio = await resampleAudioSpeex(
        monoAudio,
        analysisSampleRate
    );

    let mfccs: number[][];

    if (emphasisFactor > 0) {
        logger.start("Apply emphasis");
        resampledAudio.audioChannels[0] = applyEmphasis(
            resampledAudio.audioChannels[0],
            emphasisFactor
        );
    }

    logger.start("Compute Mel spectogram");
    const { melSpectogram } = await computeMelSpectogram(
        resampledAudio,
        fftOrder,
        windowSize,
        hopLength,
        filterbankCount,
        lowerFrequencyHz,
        upperFrequencyHz
    );

    logger.start("Extract MFCCs from Mel spectogram");
    const mfccsFloat32 = melSpectogramToMFCCs(melSpectogram, featureCount);

    mfccs = mfccsFloat32.map((mfcc) => Array.from(mfcc));

    if (options.normalize!) {
        logger.start("Normalize MFCCs");

        const { normalizedVectors, mean, stdDeviation } =
            normalizeVectors(mfccs);
        mfccs = normalizedVectors;
        //mfccs = mfccs.map(mfcc => subtractVectors(mfcc, mean))
    }

    if (lifteringFactor > 0) {
        logger.start("Apply liftering to MFCCs");
        mfccs = applyLiftering(mfccs, lifteringFactor);
    }

    if (zeroFirstCoefficient) {
        for (const mfcc of mfccs) {
            mfcc[0] = 0;
        }
    }

    logger.end();

    return mfccs;
}

type DtwGranularity = "xx-low" | "x-low" | "low" | "medium" | "high" | "x-high";

type AlignmentPath = AlignmentPathEntry[];

type AlignmentPathEntry = {
    source: number;
    dest: number;
};

type CompactedPath = CompactedPathEntry[];

type CompactedPathEntry = {
    first: number;
    last: number;
};

function getStartingSilentSampleCount(
    audioSamples: Float32Array,
    amplitudeThresholdDecibels = defaultSilenceThresholdDecibels
) {
    const minSampleAmplitude = decibelsToGainFactor(amplitudeThresholdDecibels);

    let silentSampleCount = 0;

    for (let i = 0; i < audioSamples.length - 1; i++) {
        if (Math.abs(audioSamples[i]) > minSampleAmplitude) {
            break;
        }

        silentSampleCount += 1;
    }

    return silentSampleCount;
}

function decibelsToGainFactor(decibels: number) {
    return decibels <= -100.0 ? 0 : Math.pow(10, 0.05 * decibels);
}

const defaultSilenceThresholdDecibels = -40;

function getMappedFrameIndexForPath(
    referenceFrameIndex: number,
    compactedPath: CompactedPath,
    mappingKind: "first" | "last" = "first"
) {
    if (compactedPath.length == 0) {
        return 0;
    }

    referenceFrameIndex = clip(
        referenceFrameIndex,
        0,
        compactedPath.length - 1
    );

    const compactedPathEntry = compactedPath[referenceFrameIndex];

    let mappedFrameIndex: number;

    if (mappingKind == "first") {
        mappedFrameIndex = compactedPathEntry.first;
    } else {
        mappedFrameIndex = compactedPathEntry.last;
    }

    return mappedFrameIndex;
}

function getEndingSilentSampleCount(
    audioSamples: Float32Array,
    amplitudeThresholdDecibels = defaultSilenceThresholdDecibels
) {
    const minSampleAmplitude = decibelsToGainFactor(amplitudeThresholdDecibels);

    let silentSampleCount = 0;

    for (let i = audioSamples.length - 1; i >= 0; i--) {
        if (Math.abs(audioSamples[i]) > minSampleAmplitude) {
            break;
        }

        silentSampleCount += 1;
    }

    return silentSampleCount;
}

function getMappedTimelineEntry(
    timelineEntry: TimelineEntry,
    sourceRawAudio: RawAudio,
    framesPerSecond: number,
    compactedPath: CompactedPath,
    recurse = true
): TimelineEntry {
    const referenceStartFrameIndex = Math.floor(
        timelineEntry.startTime * framesPerSecond
    );
    const referenceEndFrameIndex = Math.floor(
        timelineEntry.endTime * framesPerSecond
    );

    if (referenceStartFrameIndex < 0 || referenceEndFrameIndex < 0) {
        throw new Error(
            "Unexpected: encountered a negative timestamp in timeline"
        );
    }

    const mappedStartFrameIndex = getMappedFrameIndexForPath(
        referenceStartFrameIndex,
        compactedPath,
        "first"
    );
    const mappedEndFrameIndex = getMappedFrameIndexForPath(
        referenceEndFrameIndex,
        compactedPath,
        "first"
    );

    let innerTimeline: Timeline | undefined;

    if (recurse && timelineEntry.timeline != null) {
        innerTimeline = timelineEntry.timeline.map((entry) =>
            getMappedTimelineEntry(
                entry,
                sourceRawAudio,
                framesPerSecond,
                compactedPath,
                recurse
            )
        );
    }

    // Trim silent samples from start and end of mapped entry range
    const sourceSamplesPerFrame = Math.floor(
        sourceRawAudio.sampleRate / framesPerSecond
    );

    let startSampleIndex = mappedStartFrameIndex * sourceSamplesPerFrame;
    let endSampleIndex = mappedEndFrameIndex * sourceSamplesPerFrame;

    const frameSamples = sourceRawAudio.audioChannels[0].subarray(
        startSampleIndex,
        endSampleIndex
    );

    const silenceThresholdDecibels = -40;

    startSampleIndex += getStartingSilentSampleCount(
        frameSamples,
        silenceThresholdDecibels
    );
    endSampleIndex -= getEndingSilentSampleCount(
        frameSamples,
        silenceThresholdDecibels
    );

    endSampleIndex = Math.max(endSampleIndex, startSampleIndex);

    // Build mapped timeline entry
    const startTime = startSampleIndex / sourceRawAudio.sampleRate;
    const endTime = endSampleIndex / sourceRawAudio.sampleRate;

    return {
        type: timelineEntry.type,
        text: timelineEntry.text,

        startTime,
        endTime,

        timeline: innerTimeline,
    };
}

function getMfccOptionsForGranularity(granularity: DtwGranularity) {
    let mfccOptions: MfccOptions;

    if (granularity == "xx-low") {
        mfccOptions = {
            windowDuration: 0.4,
            hopDuration: 0.16,
            fftOrder: 8192,
        };
    } else if (granularity == "x-low") {
        mfccOptions = {
            windowDuration: 0.2,
            hopDuration: 0.08,
            fftOrder: 4096,
        };
    } else if (granularity == "low") {
        mfccOptions = {
            windowDuration: 0.1,
            hopDuration: 0.04,
            fftOrder: 2048,
        };
    } else if (granularity == "medium") {
        mfccOptions = {
            windowDuration: 0.05,
            hopDuration: 0.02,
            fftOrder: 1024,
        };
    } else if (granularity == "high") {
        mfccOptions = {
            windowDuration: 0.025,
            hopDuration: 0.01,
            fftOrder: 512,
        };
    } else if (granularity == "x-high") {
        mfccOptions = {
            windowDuration: 0.02,
            hopDuration: 0.005,
            fftOrder: 512,
        };
    } else {
        throw new Error(`Invalid granularity setting: '${granularity}'`);
    }

    return mfccOptions;
}

async function alignUsingDtw(
    sourceRawAudio: RawAudio,
    referenceRawAudio: RawAudio,
    referenceTimeline: Timeline,
    granularities: DtwGranularity[],
    windowDurations: number[]
) {
    const logger = new Logger();

    if (windowDurations.length == 0) {
        throw new Error(`Window durations array has length 0.`);
    }

    if (windowDurations.length != granularities.length) {
        throw new Error(
            `Window durations and granularities are not the same length.`
        );
    }

    const rawAudioDuration = getRawAudioDuration(sourceRawAudio);

    let framesPerSecond: number;
    let compactedPath: CompactedPath;
    let relativeCenters: number[] | undefined;

    for (let passIndex = 0; passIndex < windowDurations.length; passIndex++) {
        const granularity = granularities[passIndex];
        const windowDuration = windowDurations[passIndex];

        logger.logTitledMessage(
            `\nStarting alignment pass ${passIndex + 1}/${windowDurations.length}`,
            `granularity: ${granularity}, max window duration: ${windowDuration}s`
        );

        const mfccOptions = extendDefaultMfccOptions({
            ...getMfccOptionsForGranularity(granularity),
            zeroFirstCoefficient: true,
        }) as MfccOptions;

        framesPerSecond = 1 / mfccOptions.hopDuration!;

        // Compute reference MFCCs
        logger.start("Compute reference MFCC features");
        const referenceMfccs = await computeMFCCs(
            referenceRawAudio,
            mfccOptions
        );

        // Compute source MFCCs
        logger.start("Compute source MFCC features");
        const sourceMfccs = await computeMFCCs(sourceRawAudio, mfccOptions);
        logger.end();

        // Compute path
        logger.logTitledMessage(
            `DTW cost matrix memory size`,
            `${getCostMatrixMemorySizeMB(referenceMfccs.length, sourceMfccs.length, windowDuration * framesPerSecond).toFixed(1)}MB`
        );

        if (passIndex == 0) {
            const minRecommendedWindowDuration = 0.2 * rawAudioDuration;

            if (windowDuration < minRecommendedWindowDuration) {
                logger.logTitledMessage(
                    "Warning",
                    `Maximum DTW window duration is set to ${windowDuration.toFixed(1)}s, which is smaller than 20% of the source audio duration of ${rawAudioDuration.toFixed(1)}s. This may lead to suboptimal results in some cases. Consider increasing window duration if needed.`,
                    "warning"
                );
            }
        }

        logger.start("Align reference and source MFCC features using DTW");
        const dtwWindowLength = Math.floor(windowDuration * framesPerSecond);

        let centerIndexes: number[] | undefined;

        if (relativeCenters) {
            centerIndexes = [];

            for (let i = 0; i < referenceMfccs.length; i++) {
                const relativeReferencePosition = i / referenceMfccs.length;

                const relativeCenterIndex = Math.floor(
                    relativeReferencePosition * relativeCenters!.length
                );
                const relativeCenter = relativeCenters[relativeCenterIndex];
                const centerIndex = Math.floor(
                    relativeCenter * sourceMfccs.length
                );

                centerIndexes.push(centerIndex);
            }
        }

        const rawPath = await alignMFCC_DTW(
            referenceMfccs,
            sourceMfccs,
            dtwWindowLength,
            undefined,
            centerIndexes
        );

        compactedPath = compactPath(rawPath);

        relativeCenters = compactedPath.map(
            (entry) => (entry.first + entry.last) / 2 / sourceMfccs.length
        );

        logger.end();
    }

    logger.start("\nConvert path to timeline");

    const mappedTimeline = referenceTimeline.map((entry) =>
        getMappedTimelineEntry(
            entry,
            sourceRawAudio,
            framesPerSecond,
            compactedPath
        )
    );

    logger.end();

    return mappedTimeline;
}

class OpenPromise<T = void> {
    promise: Promise<T>;
    resolve: (value: T) => void = () => {
        throw new Error("Open promise resolved before initialization");
    };
    reject: (reason?: any) => void = () => {
        throw new Error("Open promise rejected before initialization");
    };

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

let kuromojiTokenizer: any;

async function getKuromojiTokenizer() {
    if (kuromojiTokenizer) {
        return kuromojiTokenizer;
    }

    const { default: kuromoji } = await import("kuromoji");

    const resultOpenPromise = new OpenPromise<any>();

    const kuromojiScriptPath = await resolveModuleScriptPath("kuromoji");
    const dictionaryPath = path.join(
        path.dirname(kuromojiScriptPath),
        "..",
        "/dict"
    );

    kuromoji.builder({ dicPath: dictionaryPath }).build(function (
        error: any,
        tokenizer: any
    ) {
        if (error) {
            resultOpenPromise.reject(error);
            return;
        }

        kuromojiTokenizer = tokenizer;

        resultOpenPromise.resolve(kuromojiTokenizer);
    });

    return resultOpenPromise.promise;
}

async function splitJapaneseTextToWords_Kuromoji(text: string) {
    const tokenizer = await getKuromojiTokenizer();

    const results: any[] = tokenizer.tokenize(text);
    const words = results.map((entry) => entry.surface_form);

    return words;
}

let JiebaWasmInstance: typeof import("jieba-wasm");
async function getWasmInstance() {
    if (!JiebaWasmInstance) {
        const { default: JibeaWasm } = await import("jieba-wasm");
        // @ts-ignore
        JiebaWasmInstance = JibeaWasm;
    }

    return JiebaWasmInstance;
}

async function splitChineseTextToWords_Jieba(
    text: string,
    fineGrained = false,
    useHMM = true
) {
    const jieba = await getWasmInstance();

    if (!fineGrained) {
        return jieba.cut(text, useHMM);
    } else {
        const results = jieba.tokenize(text, "search", useHMM);

        const startOffsetsSet = new Set<number>();
        const endOffsetsSet = new Set<number>();

        for (const result of results) {
            startOffsetsSet.add(result.start);
            endOffsetsSet.add(result.end);
        }

        const startOffsets = Array.from(startOffsetsSet);
        startOffsets.sort((a, b) => a - b);

        const endOffsets = Array.from(endOffsetsSet);
        endOffsets.sort((a, b) => a - b);

        const words: string[] = [];

        for (let i = 0; i < startOffsets.length; i++) {
            const wordStartOffset = startOffsets[i];

            function getWordEndOffset() {
                if (i < startOffsets.length - 1) {
                    const nextWordStartOffset = startOffsets[i + 1];

                    for (let j = 0; j < endOffsets.length - 1; j++) {
                        const currentEndOffset = endOffsets[j];
                        const nextEndOffset = endOffsets[j + 1];

                        if (currentEndOffset >= nextWordStartOffset) {
                            return nextWordStartOffset;
                        } else if (
                            currentEndOffset > wordStartOffset &&
                            currentEndOffset < nextWordStartOffset &&
                            nextEndOffset > nextWordStartOffset
                        ) {
                            return currentEndOffset;
                        }
                    }
                }

                return endOffsets[endOffsets.length - 1];
            }

            const wordEndOffset = getWordEndOffset();

            words.push(text.substring(wordStartOffset, wordEndOffset));
        }

        return words;
    }
}

function getShortLanguageCode(langCode: string) {
    const dashIndex = langCode.indexOf("-");

    if (dashIndex == -1) {
        return langCode;
    }

    return langCode.substring(0, dashIndex).toLowerCase();
}

abstract class ValueRef<T extends number | string> {
    protected ptr: number;
    private readonly manager: WasmMemoryManager;

    protected get module() {
        return this.manager.wasmModule;
    }

    constructor(ptr: number, manager: WasmMemoryManager) {
        this.ptr = ptr;
        this.manager = manager;
    }

    get value(): T {
        this.assertNotFreed();
        return this.getValue();
    }

    set value(newValue: T) {
        this.assertNotFreed();
        this.setValue(newValue);
    }

    abstract getValue(): T;
    abstract setValue(newValue: T): void;

    get address() {
        this.assertNotFreed();
        return this.ptr;
    }

    clear() {
        this.assertNotFreed();

        if (typeof this.value == "number") {
            this.value = 0 as any;
        } else if (typeof this.value == "string") {
            throw new Error("Unimplemented");
        }

        return this;
    }

    free() {
        this.manager.free(this as any);
    }

    clearAddress() {
        this.ptr = 0;
    }

    get isFreed() {
        return this.ptr == 0;
    }

    protected assertNotFreed() {
        if (this.isFreed) {
            throw new Error("Attempt to read a freed WASM value reference.");
        }
    }
}

class Int8Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAP8[this.ptr >>> 0] as number;
    }

    setValue(newValue: number) {
        this.module.HEAP8[this.ptr >>> 0] = newValue;
    }
}

class Uint8Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAPU8[this.ptr >>> 0] as number;
    }

    setValue(newValue: number) {
        this.module.HEAPU8[this.ptr >>> 0] = newValue;
    }
}

class Int16Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAP16[this.ptr >>> 1] as number;
    }

    setValue(newValue: number) {
        this.module.HEAP16[this.ptr >>> 1] = newValue;
    }
}

class Uint16Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAPU16[this.ptr >>> 1] as number;
    }

    setValue(newValue: number) {
        this.module.HEAPU16[this.ptr >>> 1] = newValue;
    }
}

class Int32Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAP32[this.ptr >>> 2] as number;
    }

    setValue(newValue: number) {
        this.module.HEAP32[this.ptr >>> 2] = newValue;
    }
}

class Uint32Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAPU32[this.ptr >>> 2] as number;
    }

    setValue(newValue: number) {
        this.module.HEAPU32[this.ptr >>> 2] = newValue;
    }
}

class PointerRef extends Uint32Ref {}

class Float32Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAPF32[this.ptr >>> 2] as number;
    }

    setValue(newValue: number) {
        this.module.HEAPF32[this.ptr >>> 2] = newValue;
    }
}

class Float64Ref extends ValueRef<number> {
    getValue() {
        return this.module.HEAPF64[this.ptr >>> 3] as number;
    }

    setValue(newValue: number) {
        this.module.HEAPF64[this.ptr >>> 3] = newValue;
    }
}

class NullTerminatedUtf8StringRef extends ValueRef<string> {
    getValue() {
        const ptr = this.ptr >>> 0;

        const heapU8 = this.module.HEAPU8;

        const endByteOffset = heapU8.subarray(ptr).indexOf(0);

        const strBytes = heapU8.subarray(ptr, ptr + endByteOffset);

        const str = Buffer.from(strBytes).toString("utf8");

        return str;
    }

    setValue(newValue: string) {
        throw new Error("Unimplemented");
    }
}

abstract class TypedArrayRef<T extends TypedArray> {
    protected ptr: number;
    readonly length: number;
    private readonly manager: WasmMemoryManager;

    get module() {
        return this.manager.wasmModule;
    }

    constructor(ptr: number, length: number, manager: WasmMemoryManager) {
        this.ptr = ptr;
        this.length = length;
        this.manager = manager;
    }

    get view() {
        this.assertNotFreed();
        return this.getView();
    }

    protected abstract getView(): T;

    slice(start?: number, end?: number) {
        return this.view.slice(start, end);
    }

    get address() {
        this.assertNotFreed();
        return this.ptr;
    }

    clear() {
        this.view.fill(0);
        return this;
    }

    free() {
        this.manager.free(this);
    }

    clearAddress() {
        this.ptr = 0;
    }

    get isFreed() {
        return this.ptr == 0;
    }

    protected assertNotFreed() {
        if (this.isFreed) {
            throw new Error(
                "Attempt to read a freed WASM typed array reference."
            );
        }
    }
}

class Int8ArrayRef extends TypedArrayRef<Int8Array> {
    getView() {
        const startIndex = this.ptr >>> 0;
        return this.module.HEAP8.subarray(
            startIndex,
            startIndex + this.length
        ) as Int8Array;
    }
}

class Uint8ArrayRef extends TypedArrayRef<Uint8Array> {
    getView() {
        const startIndex = this.ptr >>> 0;
        return this.module.HEAPU8.subarray(
            startIndex,
            startIndex + this.length
        ) as Uint8Array;
    }

    readAsNullTerminatedUtf8String(): string {
        let strBytes = this.view;

        const indexOfFirstZero = strBytes.indexOf(0);

        if (indexOfFirstZero >= 0) {
            strBytes = strBytes.subarray(0, indexOfFirstZero);
        }

        const str = Buffer.from(strBytes).toString("utf8");

        return str;
    }
}

class Int16ArrayRef extends TypedArrayRef<Int16Array> {
    getView() {
        const startIndex = this.ptr >>> 1;
        return this.module.HEAP16.subarray(
            startIndex,
            startIndex + this.length
        ) as Int16Array;
    }
}

class Uint16ArrayRef extends TypedArrayRef<Uint16Array> {
    getView() {
        const startIndex = this.ptr >>> 1;
        return this.module.HEAPU16.subarray(
            startIndex,
            startIndex + this.length
        ) as Uint16Array;
    }
}

class Int32ArrayRef extends TypedArrayRef<Int32Array> {
    getView() {
        const startIndex = this.ptr >>> 2;
        return this.module.HEAP32.subarray(
            startIndex,
            startIndex + this.length
        ) as Int32Array;
    }
}

class Uint32ArrayRef extends TypedArrayRef<Uint32Array> {
    getView() {
        const startIndex = this.ptr >>> 2;
        return this.module.HEAPU32.subarray(
            startIndex,
            startIndex + this.length
        ) as Uint32Array;
    }
}

class Float32ArrayRef extends TypedArrayRef<Float32Array> {
    getView() {
        const startIndex = this.ptr >>> 2;
        return this.module.HEAPF32.subarray(
            startIndex,
            startIndex + this.length
        ) as Float32Array;
    }
}

class Float64ArrayRef extends TypedArrayRef<Float64Array> {
    getView() {
        const startIndex = this.ptr >>> 3;
        return this.module.HEAPF64.subarray(
            startIndex,
            startIndex + this.length
        ) as Float64Array;
    }
}

type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;
type WasmRef = ValueRef<number> | ValueRef<string> | TypedArrayRef<TypedArray>;

class WasmMemoryManager {
    wasmModule: any;

    private allocatedReferences = new Set<WasmRef>();

    constructor(wasmModule: any) {
        this.wasmModule = wasmModule;
    }

    allocInt8() {
        const address = this.alloc(1);
        return this.wrapInt8(address).clear();
    }

    wrapInt8(address: number) {
        const ref = new Int8Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocUint8() {
        const address = this.alloc(1);
        return this.wrapUint8(address).clear();
    }

    wrapUint8(address: number) {
        const ref = new Uint8Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocInt16() {
        const address = this.alloc(2);
        return this.wrapInt16(address).clear();
    }

    wrapInt16(address: number) {
        const ref = new Int16Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocUint16() {
        const address = this.alloc(2);
        return this.wrapUint16(address).clear();
    }

    wrapUint16(address: number) {
        const ref = new Uint16Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocInt32() {
        const address = this.alloc(4);
        return this.wrapInt32(address).clear();
    }

    wrapInt32(address: number) {
        const ref = new Int32Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocUint32() {
        const address = this.alloc(4);
        return this.wrapUint32(address).clear();
    }

    wrapUint32(address: number) {
        const ref = new Uint32Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocPointer() {
        const address = this.alloc(4);
        return this.wrapPointer(address).clear();
    }

    wrapPointer(address: number) {
        const ref = new PointerRef(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocFloat32() {
        const address = this.alloc(4);
        return this.wrapFloat64(address).clear();
    }

    wrapFloat32(address: number) {
        const ref = new Float32Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocFloat64() {
        const address = this.alloc(8);
        return this.wrapFloat64(address).clear();
    }

    wrapFloat64(address: number) {
        const ref = new Float64Ref(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    // Allocate or wrap arrays
    allocInt8Array(length: number) {
        const address = this.alloc(length << 0);
        return this.wrapInt8Array(address, length).clear();
    }

    wrapInt8Array(address: number, length: number) {
        const ref = new Int8ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocUint8Array(length: number) {
        const address = this.alloc(length << 0);
        return this.wrapUint8Array(address, length).clear();
    }

    wrapUint8Array(address: number, length: number) {
        const ref = new Uint8ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocInt16Array(length: number) {
        const address = this.alloc(length << 1);
        return this.wrapInt16Array(address, length).clear();
    }

    wrapInt16Array(address: number, length: number) {
        const ref = new Int16ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocUint16Array(length: number) {
        const address = this.alloc(length << 1);
        return this.wrapUint16Array(address, length).clear();
    }

    wrapUint16Array(address: number, length: number) {
        const ref = new Uint16ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocInt32Array(length: number) {
        const address = this.alloc(length << 2);
        return this.wrapInt32Array(address, length).clear();
    }

    wrapInt32Array(address: number, length: number) {
        const ref = new Int32ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocUint32Array(length: number) {
        const address = this.alloc(length << 2);
        return this.wrapUint32Array(address, length).clear();
    }

    wrapUint32Array(address: number, length: number) {
        const ref = new Uint32ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocFloat32Array(length: number) {
        const address = this.alloc(length << 2);
        return this.wrapFloat32Array(address, length).clear();
    }

    wrapFloat32Array(address: number, length: number) {
        const ref = new Float32ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocFloat64Array(length: number) {
        const address = this.alloc(length << 3);
        return this.wrapFloat64Array(address, length).clear();
    }

    wrapFloat64Array(address: number, length: number) {
        const ref = new Float64ArrayRef(address, length, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    allocNullTerminatedUtf8String(str: string) {
        const strBuffer = Buffer.concat([
            Buffer.from(str, "utf8"),
            Buffer.alloc(1),
        ]);
        const ref = this.allocUint8Array(strBuffer.length);
        ref.view.set(strBuffer);
        return ref;
    }

    wrapNullTerminatedUtf8String(address: number) {
        const ref = new NullTerminatedUtf8StringRef(address, this);
        this.allocatedReferences.add(ref);
        return ref;
    }

    private alloc(size: number) {
        const ptr = this.wasmModule._malloc(size);
        return ptr as number;
    }

    free(wasmReference: WasmRef) {
        if (wasmReference.isFreed) {
            return;
        }

        this.wasmModule._free(wasmReference.address);

        this.allocatedReferences.delete(wasmReference);
        wasmReference.clearAddress();
    }

    freeAll() {
        for (const wasmReference of this.allocatedReferences) {
            this.free(wasmReference);
        }
    }
}

function concatFloat32Arrays(arrays: Float32Array[]) {
    return concatTypedArrays<Float32Array>(Float32Array, arrays);
}

function simplifyPunctuationCharacters(text: string) {
    return text
        .replaceAll(`“`, `"`)
        .replaceAll(`”`, `"`)
        .replaceAll(`„`, `"`)
        .replaceAll(`ߵ`, `"`)
        .replaceAll(`ߴ`, `"`)
        .replaceAll(`«`, `"`)
        .replaceAll(`»`, `"`)

        .replaceAll(`’`, `'`)
        .replaceAll(`ʼ`, `'`)
        .replaceAll(`ʼ`, `'`)
        .replaceAll(`＇`, `'`)
        .replaceAll(`，`, `,`)
        .replaceAll(`、`, `,`)
        .replaceAll(`：`, `:`)
        .replaceAll(`；`, `;`)
        .replaceAll(`。`, `.`)

        .replaceAll(`？`, `?`)
        .replaceAll(`！`, `!`)
        .replaceAll(`؟`, `?`);
}

function normalizeFourDigitDecadeString(decadeString: string) {
    const firstTwoDigitsValue = parseInt(decadeString.substring(0, 2));
    const secondTwoDigitsValue = parseInt(decadeString.substring(2, 4));

    let normalizedString: string;

    const isBeforeSecondMillenium = firstTwoDigitsValue < 10;
    const isMilleniumDecade =
        firstTwoDigitsValue % 10 == 0 && secondTwoDigitsValue == 0;

    if (!isBeforeSecondMillenium && !isMilleniumDecade) {
        if (secondTwoDigitsValue != 0) {
            normalizedString = `${firstTwoDigitsValue} ${secondTwoDigitsValue}s`;
        } else {
            normalizedString = `${firstTwoDigitsValue} hundreds`;
        }
    } else {
        normalizedString = decadeString;
    }

    return normalizedString;
}

function normalizeFourDigitYearString(yearString: string) {
    const firstTwoDigitsValue = parseFloat(yearString.substring(0, 2));
    const secondTwoDigitsValue = parseFloat(yearString.substring(2, 4));

    let normalizedString: string;

    if (firstTwoDigitsValue >= 10 && secondTwoDigitsValue >= 10) {
        normalizedString = `${firstTwoDigitsValue} ${secondTwoDigitsValue}`;
    } else if (
        firstTwoDigitsValue >= 10 &&
        firstTwoDigitsValue % 10 != 0 &&
        secondTwoDigitsValue < 10
    ) {
        normalizedString = `${firstTwoDigitsValue} oh ${secondTwoDigitsValue}`;
    } else {
        normalizedString = yearString;
    }

    return normalizedString;
}

function getNormalizedFragmentsForSpeech(words: string[], language: string) {
    language = getShortLanguageCode(language);

    if (language != "en") {
        return {
            normalizedFragments: [...words],
            referenceFragments: [...words],
        };
    }

    const numberPattern = /^[0-9][0-9\,\.]*$/;

    const fourDigitYearPattern = /^[0-9][0-9][0-9][0-9]$/;
    const fourDigitDecadePattern = /^[0-9][0-9][0-9]0s$/;

    const fourDigitYearRangePattern =
        /^[0-9][0-9][0-9][0-9][\-\–][0-9][0-9][0-9][0-9]$/;

    const wordsPrecedingAYear = [
        "in",
        "the",
        "a",
        "to",
        "of",
        "since",
        "from",
        "between",
        "by",
        "until",
        "around",
        "before",
        "after",
        "his",
        "her",
        "year",
        "years",
        "during",
        "copyright",
        "©",
        "early",
        "mid",
        "late",
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
    ];

    const wordsPrecedingADecade = ["the", "in", "early", "mid", "late", "a"];

    const symbolsPrecedingACurrency = ["$", "€", "£", "¥"];

    const symbolsPrecedingACurrencyAsWords = [
        "dollars",
        "euros",
        "pounds",
        "yen",
    ];

    const wordsSucceedingACurrency = ["million", "billion", "trillion"];

    const normalizedFragments: string[] = [];
    const referenceFragments: string[] = [];

    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        const word = words[wordIndex];
        const lowerCaseWord = word.toLowerCase();

        const nextWords = words.slice(wordIndex + 1);
        const nextWord = nextWords[0];

        if (
            // Normalize a four digit year pattern, e.g. 'in 1995'.
            wordsPrecedingAYear.includes(lowerCaseWord) &&
            fourDigitYearPattern.test(nextWord)
        ) {
            const normalizedString = normalizeFourDigitYearString(nextWord);

            normalizedFragments.push(word);
            referenceFragments.push(word);

            normalizedFragments.push(normalizedString);
            referenceFragments.push(nextWord);

            wordIndex += 1;
        } else if (
            // Normalize a four digit decade pattern, e.g. 'the 1980s'.
            wordsPrecedingADecade.includes(lowerCaseWord) &&
            fourDigitDecadePattern.test(nextWord)
        ) {
            const normalizedString = normalizeFourDigitDecadeString(nextWord);

            normalizedFragments.push(word);
            referenceFragments.push(word);

            normalizedFragments.push(normalizedString);
            referenceFragments.push(nextWord);

            wordIndex += 1;
        } else if (
            // Normalize a year range pattern, e.g. '1835-1896'
            fourDigitYearRangePattern.test(
                words.slice(wordIndex, wordIndex + 3).join("")
            )
        ) {
            normalizedFragments.push(
                normalizeFourDigitYearString(words[wordIndex])
            );
            referenceFragments.push(words[wordIndex]);

            normalizedFragments.push("to");
            referenceFragments.push(words[wordIndex + 1]);

            normalizedFragments.push(
                normalizeFourDigitYearString(words[wordIndex + 2])
            );
            referenceFragments.push(words[wordIndex + 2]);

            wordIndex += 2;
        } else if (
            // Normalize a currency pattern, e.g. '$53.1 million', '€3.53'
            symbolsPrecedingACurrency.includes(lowerCaseWord) &&
            numberPattern.test(nextWord)
        ) {
            const currencyWord =
                symbolsPrecedingACurrencyAsWords[
                    symbolsPrecedingACurrency.indexOf(lowerCaseWord)
                ];

            if (wordsSucceedingACurrency.includes(nextWords[1].toLowerCase())) {
                const normalizedString = `${nextWord} ${nextWords[1]} ${currencyWord}`;

                normalizedFragments.push(normalizedString);

                const referenceString = `${word}${nextWord} ${nextWords[1]}`;
                referenceFragments.push(referenceString);

                wordIndex += 2;
            } else {
                const normalizedString = `${nextWord} ${currencyWord}`;

                normalizedFragments.push(normalizedString);

                const referenceString = `${word}${nextWord}`;
                referenceFragments.push(referenceString);

                wordIndex += 1;
            }
        } else {
            normalizedFragments.push(word);
            referenceFragments.push(word);
        }
    }

    return { normalizedFragments, referenceFragments };
}

const wordCharacterPattern = /[\p{Letter}\p{Number}]/u;

async function splitToWords(text: string, langCode: string): Promise<string[]> {
    const shortLangCode = getShortLanguageCode(langCode || "");

    if (shortLangCode == "zh" || shortLangCode == "cmn") {
        return splitChineseTextToWords_Jieba(text, undefined, true);
    } else if (shortLangCode == "ja") {
        return splitJapaneseTextToWords_Kuromoji(text);
    } else {
        return CldrSegmentation.wordSplit(
            text,
            CldrSegmentation.suppressions[shortLangCode]
        );
    }
}

const ipaToKirshenbaum: { [p: string]: string | undefined } = {
    "1": "1",
    "2": "2",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "9": "9",
    " ": " ",
    "!": "!",
    "'": "'",
    ʰ: "#",
    $: "$",
    "%": "%",
    //'æ': '&',
    æ: "a",
    ˈ: "'",
    "(": "(",
    ")": ")",
    ɾ: "*",
    "+": "+",
    ˌ: ",",
    "-": "-",
    ".": ".",
    "/": "/",
    ɒ: "0",
    ɜ: "3",
    ɵ: "8",
    ː: ":",
    ʲ: ";",
    "<": "<",
    "=": "=",
    ">": ">",
    ʔ: "?",
    ə: "@",
    ɑ: "A",
    β: "B",
    ç: "C",
    ð: "D",
    ɛ: "E",
    F: "F",
    ɢ: "G",
    ħ: "H",
    ɪ: "I",
    ɟ: "J",
    K: "K",
    ɫ: "L",
    ɱ: "M",
    ŋ: "N",
    ɔ: "O",
    Φ: "P",
    ɣ: "Q",
    ʀ: "R",
    ʃ: "S",
    θ: "T",
    ʊ: "U",
    ʌ: "V",
    œ: "W",
    χ: "X",
    ø: "Y",
    ʒ: "Z",
    "̪": "[",
    "\\": "\\",
    "]": "]",
    "^": "^",
    _: "_",
    "`": "`",
    a: "a",
    b: "b",
    c: "c",
    d: "d",
    e: "e",
    f: "f",
    ɡ: "g",
    h: "h",
    i: "i",
    j: "j",
    k: "k",
    l: "l",
    m: "m",
    n: "n",
    o: "o",
    p: "p",
    q: "q",
    r: "r",
    s: "s",
    t: "t",
    u: "u",
    v: "v",
    w: "w",
    x: "x",
    y: "y",
    z: "z",
    "{": "{",
    "|": "|",
    "}": "}",
    "̃": "~",
    "": "",

    // Extensions
    ɚ: "3",
    ɹ: "r",
    ɐ: "a#",
    ᵻ: "i",
    "̩": ",",
};

function ipaPhoneToKirshenbaum(ipaPhone: string) {
    let result = "";

    for (const char of ipaPhone) {
        const convertedChar = ipaToKirshenbaum[char];

        if (convertedChar == undefined) {
            throw new Error(
                `Could not convert phone character '${char}' to Kirshenbaum encoding`
            );
        }

        result += convertedChar || "_";
    }

    return result;
}

function deepClone<T>(val: T) {
    return clone(val, true);
}

function clone<T>(val: T, deep = true, seenObjects: any[] = []): T {
    if (val == null || typeof val !== "object") {
        return val;
    }

    const obj = <any>val;
    const prototypeIdentifier = toString.call(obj);

    switch (prototypeIdentifier) {
        case "[object Array]": {
            if (seenObjects.includes(obj)) {
                throw new Error("deepClone: encountered a cyclic object");
            }

            seenObjects.push(obj);

            const clonedArray = new Array(obj.length);

            for (let i = 0; i < obj.length; i++) {
                if (deep) {
                    clonedArray[i] = clone(obj[i], true, seenObjects);
                } else {
                    clonedArray[i] = obj[i];
                }
            }

            seenObjects.pop();

            return <any>clonedArray;
        }

        case "[object ArrayBuffer]": {
            const clonedArray = new Uint8Array(obj.byteLength);
            clonedArray.set(new Uint8Array(obj));
            return <any>clonedArray.buffer;
        }

        case "[object Int8Array]": {
            const clonedArray = new Int8Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Uint8Array]": {
            const clonedArray = new Uint8Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Uint8ClampedArray]": {
            const clonedArray = new Uint8ClampedArray(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Int16Array]": {
            const clonedArray = new Int16Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Uint16Array]": {
            const clonedArray = new Uint16Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Int32Array]": {
            const clonedArray = new Int32Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Uint32Array]": {
            const clonedArray = new Uint32Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Float32Array]": {
            const clonedArray = new Float32Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Float64Array]": {
            const clonedArray = new Float64Array(obj.length);
            clonedArray.set(obj);
            return <any>clonedArray;
        }

        case "[object Date]": {
            return <any>new Date(obj.valueOf());
        }

        case "[object RegExp]": {
            return obj;
        }

        case "[object Function]": {
            return obj;
        }

        case "[object Object]": {
            if (seenObjects.includes(obj)) {
                throw new Error("deepClone: encountered a cyclic object");
            }

            seenObjects.push(obj);

            const clonedObj: any = {};

            for (const propName in obj) {
                if (!obj.hasOwnProperty(propName)) {
                    continue;
                }

                if (deep) {
                    clonedObj[propName] = clone(
                        obj[propName],
                        true,
                        seenObjects
                    );
                } else {
                    clonedObj[propName] = obj[propName];
                }
            }

            seenObjects.pop();

            return clonedObj;
        }

        default: {
            throw new Error(
                `Cloning of type ${prototypeIdentifier} is not supported`
            );
        }
    }
}

function isPlainObject(val: any) {
    return (
        val != null &&
        typeof val === "object" &&
        toString.call(val) === "[object Object]"
    );
}

function extendDeep(base: any, extension: any): any {
    const baseClone = deepClone(base);

    if (isPlainObject(base) && extension === undefined) {
        return baseClone;
    }

    const extensionClone = deepClone(extension);
    if (!isPlainObject(base) || !isPlainObject(extension)) {
        return extensionClone;
    }

    for (const propName in extensionClone) {
        if (!extensionClone.hasOwnProperty(propName)) {
            continue;
        }

        baseClone[propName] = extendDeep(
            baseClone[propName],
            extensionClone[propName]
        );
    }

    return baseClone;
}

function tryGetFirstLexiconSubstitution(
    sentenceWords: string[],
    wordIndex: number,
    lexicons: Lexicon[],
    languageCode: string
) {
    const reversedLexicons = [...lexicons].reverse(); // Give precedence to later lexicons

    for (const lexicon of reversedLexicons) {
        const match = tryGetLexiconSubstitution(
            sentenceWords,
            wordIndex,
            lexicon,
            languageCode
        );

        if (match) {
            return match;
        }
    }

    return undefined;
}

function tryGetLexiconSubstitution(
    sentenceWords: string[],
    wordIndex: number,
    lexicon: Lexicon,
    languageCode: string
) {
    const word = sentenceWords[wordIndex];

    if (!word) {
        return;
    }

    const shortLanguageCode = getShortLanguageCode(languageCode);
    const lexiconForLanguage = lexicon[shortLanguageCode];

    if (!lexiconForLanguage) {
        return;
    }

    const lexiconEntry = lexiconForLanguage[word];

    if (!lexiconEntry) {
        return;
    }

    for (let i = 0; i < lexiconEntry.length; i++) {
        const substitutionEntry = lexiconEntry[i];

        const substitutionPhonemesText =
            substitutionEntry?.pronunciation?.espeak?.[languageCode];

        if (!substitutionPhonemesText) {
            continue;
        }

        const precedingWord = sentenceWords[wordIndex - 1] || "";
        const succeedingWord = sentenceWords[wordIndex + 1] || "";

        const precededBy = substitutionEntry?.precededBy || [];
        const notPrecededBy = substitutionEntry?.notPrecededBy || [];

        const succeededBy = substitutionEntry?.succeededBy || [];
        const notSucceededBy = substitutionEntry?.notSucceededBy || [];

        const hasNegativePattern =
            notPrecededBy.includes(precedingWord) ||
            notSucceededBy.includes(succeedingWord);
        const hasPositivePattern =
            precededBy.includes(precedingWord) ||
            succeededBy.includes(succeedingWord);

        if (
            i == lexiconEntry.length - 1 ||
            (hasPositivePattern && !hasNegativePattern)
        ) {
            const substitutionPhonemes = substitutionPhonemesText.split(/ +/g);

            return substitutionPhonemes;
        }
    }

    return;
}

function int16PcmToFloat32(input: Int16Array) {
    const output = new Float32Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = input[i];
        output[i] = sample < 0 ? sample / 32768 : sample / 32767;
    }

    return output;
}

let espeakInstance: any;
let espeakModule: any;

type EspeakEventType =
    | "sentence"
    | "word"
    | "phoneme"
    | "end"
    | "mark"
    | "play"
    | "msg_terminated"
    | "list_terminated"
    | "samplerate";

interface EspeakEvent {
    audio_position: number;
    type: EspeakEventType;
    text_position: number;
    word_length: number;
    id?: string | number;
}

async function setVoice(voiceId: string) {
    const { instance } = await getEspeakInstance();

    instance.set_voice(voiceId);
}

async function getEspeakInstance() {
    if (!espeakInstance) {
        const { default: EspeakInitializer } = await import(
            "@echogarden/espeak-ng-emscripten"
        );

        const m = await EspeakInitializer();
        espeakInstance = await new m.eSpeakNGWorker();
        espeakModule = m;
    }

    return { instance: espeakInstance, module: espeakModule };
}

async function getSampleRate(): Promise<22050> {
    return 22050;
}

async function synthesizeFragments(
    fragments: string[],
    espeakOptions: EspeakOptions
) {
    espeakOptions = extendDeep(defaultEspeakOptions, espeakOptions);

    const voice = espeakOptions.voice;

    const sampleRate = await getSampleRate();

    if (fragments.length === 0) {
        return {
            rawAudio: getEmptyRawAudio(1, sampleRate),
            timeline: [] as Timeline,
            events: [] as EspeakEvent[],
        };
    }

    const canInsertSeparators = ![
        "roa/an",
        "art/eo",
        "trk/ky",
        "zlw/pl",
        "zle/uk",
    ].includes(voice);

    let textWithMarkers: string;

    if (canInsertSeparators) {
        textWithMarkers = `() | `;
    } else {
        textWithMarkers = `() `;
    }

    for (let i = 0; i < fragments.length; i++) {
        let fragment = fragments[i];

        fragment = simplifyPunctuationCharacters(fragment);

        fragment = fragment.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

        if (espeakOptions.insertSeparators && canInsertSeparators) {
            const separator = ` | `;

            textWithMarkers += `<mark name="s-${i}"/>${separator}${fragment}${separator}<mark name="e-${i}"/>`;
        } else {
            if (fragment.endsWith(".")) {
                fragment += " ()";
            }

            textWithMarkers += `<mark name="s-${i}"/>${fragment}<mark name="e-${i}"/> `;
        }
    }

    const { rawAudio, events } = await espeakSynthesize(textWithMarkers, {
        ...espeakOptions,
        ssml: true,
    });

    // Add first marker if missing
    if (fragments.length > 0) {
        const firstMarkerEvent = events.find((event) => event.type === "mark");

        if (firstMarkerEvent && firstMarkerEvent.id === "e-0") {
            events.unshift({
                type: "mark",
                text_position: 0,
                word_length: 0,
                audio_position: 0,
                id: "s-0",
            });
        }
    }

    // Build word timeline from events
    const wordTimeline: Timeline = fragments.map((word) => ({
        type: "word",
        text: word,
        startTime: -1,
        endTime: -1,
        timeline: [
            {
                type: "token",
                text: "",
                startTime: -1,
                endTime: -1,
                timeline: [],
            },
        ],
    }));

    let wordIndex = 0;

    const clauseEndIndexes: number[] = [];

    for (const event of events) {
        const eventTime = event.audio_position / 1000;

        const currentWordEntry = wordTimeline[wordIndex];

        const currentTokenTimeline = currentWordEntry.timeline!;
        const currentTokenEntry =
            currentTokenTimeline[currentTokenTimeline.length - 1];

        const currentPhoneTimeline = currentTokenEntry.timeline!;
        const lastPhoneEntry =
            currentPhoneTimeline[currentPhoneTimeline.length - 1];

        if (lastPhoneEntry && lastPhoneEntry.endTime === -1) {
            lastPhoneEntry.endTime = eventTime;
        }

        if (event.type === "word") {
            if (!event.id || currentPhoneTimeline.length === 0) {
                continue;
            }

            if (currentTokenEntry.endTime === -1) {
                currentTokenEntry.endTime = eventTime;
            }

            currentTokenTimeline.push({
                type: "token",
                text: "",
                startTime: eventTime,
                endTime: -1,
                timeline: [],
            });
        } else if (event.type === "phoneme") {
            const phoneText = event.id as string;

            if (!phoneText || phoneText.startsWith("(")) {
                continue;
            }

            currentPhoneTimeline.push({
                type: "phone",
                text: phoneText,
                startTime: eventTime,
                endTime: -1,
            });

            currentTokenEntry.text += phoneText;
            currentTokenEntry.startTime = currentPhoneTimeline[0].startTime;
        } else if (event.type === "mark") {
            const markerName = event.id! as string;

            if (markerName.startsWith("s-")) {
                const markerIndex = parseInt(markerName.substring(2));

                if (markerIndex != wordIndex) {
                    throw new Error(
                        `Word start marker for index ${wordIndex} is not consistent with word index. The words were: ${objToString(fragments)}`
                    );
                }

                if (currentPhoneTimeline.length > 0) {
                    throw new Error(
                        `Word entry ${wordIndex} already has phones before its start marker was seen. The words were: ${objToString(fragments)}`
                    );
                }

                currentWordEntry.startTime = eventTime;
                currentTokenEntry.startTime = eventTime;
            } else if (markerName.startsWith("e-")) {
                const markerIndex = parseInt(markerName.substring(2));

                if (markerIndex != wordIndex) {
                    throw new Error(
                        `Word end marker for index ${wordIndex} is not consistent with word index. The words were: ${objToString(fragments)}`
                    );
                }

                currentWordEntry.startTime = currentTokenTimeline[0].startTime;

                currentWordEntry.endTime = eventTime;
                currentTokenEntry.endTime = eventTime;

                wordIndex += 1;

                if (wordIndex === wordTimeline.length) {
                    break;
                }
            } else {
                continue;
            }
        } else if (event.type === "end") {
            clauseEndIndexes.push(wordIndex);
        }
    }

    clauseEndIndexes.push(wordTimeline.length);

    // Split compound tokens
    for (const [index, wordEntry] of wordTimeline.entries()) {
        const tokenTimeline = wordEntry.timeline;

        if (index === 0) {
            continue;
        }

        if (!tokenTimeline || tokenTimeline.length === 0) {
            throw new Error(
                "Unexpected: token timeline should exist and have at least one token"
            );
        }

        if (tokenTimeline.length !== 1 && tokenTimeline[0].text != "") {
            continue;
        }

        const wordReferencePhonemes = (
            await textToPhonemes(wordEntry.text, espeakOptions.voice, true)
        ).split("_");

        const wordReferenceIPA = wordReferencePhonemes.join(" ");

        if (wordReferenceIPA.trim().length === 0) {
            continue;
        }

        const wordReferenceIPAWithoutStress = wordReferenceIPA
            .replaceAll("ˈ", "")
            .replaceAll("ˌ", "");

        const previousWordEntry = wordTimeline[index - 1];

        if (!previousWordEntry.timeline) {
            continue;
        }

        const previousWordTokenEntry =
            previousWordEntry.timeline[previousWordEntry.timeline.length - 1];

        if (!previousWordTokenEntry.timeline) {
            continue;
        }

        const previousWordTokenIPAWithoutStress =
            previousWordTokenEntry.timeline
                .map((phoneEntry) =>
                    phoneEntry.text.replaceAll("ˈ", "").replaceAll("ˌ", "")
                )
                .join(" ");

        if (
            previousWordEntry.timeline.length > 1 &&
            previousWordTokenIPAWithoutStress === wordReferenceIPAWithoutStress
        ) {
            tokenTimeline.pop();

            const tokenEntryToInsert = previousWordEntry.timeline.pop()!;
            tokenTimeline.push(tokenEntryToInsert);

            previousWordEntry.endTime =
                previousWordEntry.timeline[
                    previousWordEntry.timeline.length - 1
                ].endTime;

            wordEntry.startTime = tokenEntryToInsert.startTime;
            wordEntry.endTime = tokenEntryToInsert.endTime;

            continue;
        }

        if (
            previousWordTokenEntry.timeline.length <=
            wordReferencePhonemes.length
        ) {
            continue;
        }

        if (
            !previousWordTokenIPAWithoutStress.endsWith(
                wordReferenceIPAWithoutStress
            )
        ) {
            continue;
        }

        const tokenEntry = tokenTimeline[0];

        tokenEntry.timeline = previousWordTokenEntry.timeline.splice(
            previousWordTokenEntry.timeline.length -
                wordReferencePhonemes.length
        );
        tokenEntry.text = tokenEntry.timeline
            .map((phoneEntry) => phoneEntry.text)
            .join("");

        tokenEntry.startTime = tokenEntry.timeline[0].startTime;
        tokenEntry.endTime =
            tokenEntry.timeline[tokenEntry.timeline.length - 1].endTime;
        wordEntry.startTime = tokenEntry.startTime;
        wordEntry.endTime = tokenEntry.endTime;

        previousWordTokenEntry.text = previousWordTokenEntry.timeline
            .map((phoneEntry) => phoneEntry.text)
            .join("");
        previousWordTokenEntry.endTime =
            previousWordTokenEntry.timeline[
                previousWordTokenEntry.timeline.length - 1
            ].endTime;
        previousWordEntry.endTime = previousWordTokenEntry.endTime;
    }

    // Build clause timeline
    const clauseTimeline: Timeline = [];

    let clauseStartIndex = 0;

    for (const clauseEndIndex of clauseEndIndexes) {
        const newClause: TimelineEntry = {
            type: "clause",
            text: "",
            startTime: -1,
            endTime: -1,
            timeline: [],
        };

        for (
            let entryIndex = clauseStartIndex;
            entryIndex <= clauseEndIndex && entryIndex < wordTimeline.length;
            entryIndex++
        ) {
            const wordEntry = wordTimeline[entryIndex];
            if (newClause.startTime === -1) {
                newClause.startTime = wordEntry.startTime;
            }

            newClause.endTime = wordEntry.endTime;

            newClause.text += `${wordEntry.text} `;

            newClause.timeline!.push(wordEntry);
        }

        if (newClause.timeline!.length > 0) {
            clauseTimeline.push(newClause);
            clauseStartIndex = clauseEndIndex + 1;
        }
    }

    return { rawAudio, timeline: clauseTimeline, events };
}

async function setRate(rate: number) {
    const { instance } = await getEspeakInstance();

    return instance.set_rate(rate);
}

async function setPitch(pitch: number) {
    const { instance } = await getEspeakInstance();

    return instance.set_pitch(pitch);
}

async function setPitchRange(pitchRange: number) {
    const { instance } = await getEspeakInstance();

    return instance.set_range(pitchRange);
}

async function espeakSynthesize(text: string, espeakOptions: EspeakOptions) {
    const logger = new Logger();

    espeakOptions = extendDeep(defaultEspeakOptions, espeakOptions);

    logger.start("Get eSpeak Emscripten instance");

    if (!espeakOptions.ssml) {
        const { escape } = await import("html-escaper");

        text = escape(text);
    }

    const { instance } = await getEspeakInstance();

    const sampleChunks: Float32Array[] = [];
    const allEvents: EspeakEvent[] = [];

    logger.start("Synthesize with eSpeak");

    if (espeakOptions.useKlatt) {
        await setVoice(`${espeakOptions.voice}+klatt6`);
    } else {
        await setVoice(espeakOptions.voice);
    }

    await setRate(espeakOptions.rate);
    await setPitch(espeakOptions.pitch);
    await setPitchRange(espeakOptions.pitchRange);

    instance.synthesize(text, (samples: Int16Array, events: EspeakEvent[]) => {
        if (samples && samples.length > 0) {
            sampleChunks.push(int16PcmToFloat32(samples));
        }

        for (const event of events) {
            if (event.type === "word") {
                const textPosition = event.text_position - 1;
                (event as any)["text"] = text.substring(
                    textPosition,
                    textPosition + event.word_length
                );
            }
        }

        allEvents.push(...events);
    });

    const concatenatedSamples = concatFloat32Arrays(sampleChunks);

    const rawAudio: RawAudio = {
        audioChannels: [concatenatedSamples],
        sampleRate: 22050,
    };

    logger.end();

    return { rawAudio, events: allEvents };
}

async function textToPhonemes(text: string, voice: string, useIPA = true) {
    await setVoice(voice);
    const { instance, module } = await getEspeakInstance();
    const textPtr = instance.convert_to_phonemes(text, useIPA);

    const wasmMemory = new WasmMemoryManager(module);

    const resultRef = wasmMemory.wrapNullTerminatedUtf8String(textPtr.ptr);
    const result = resultRef.getValue();

    wasmMemory.freeAll();

    return result;
}

async function preprocessAndSynthesize(
    text: string,
    language: string,
    espeakOptions: EspeakOptions,
    lexicons: Lexicon[] = []
) {
    const logger = new Logger();

    espeakOptions = extendDeep(defaultEspeakOptions, espeakOptions);

    await logger.startAsync("Tokenize and analyze text");

    let lowerCaseLanguageCode = language.toLowerCase();

    if (lowerCaseLanguageCode === "en-gb") {
        lowerCaseLanguageCode = "en-gb-x-rp";
    }

    let fragments: string[];
    let preprocessedFragments: string[];
    const phonemizedFragmentsSubstitutions = new Map<number, string[]>();

    fragments = [];
    preprocessedFragments = [];

    let words = await splitToWords(text, language);

    // Merge repeating symbol words to a single word to work around eSpeak bug
    const wordsWithMerges: string[] = [];

    for (let i = 0; i < words.length; i++) {
        const currentWord = words[i];
        const previousWord = words[i - 1];

        if (
            i > 0 &&
            currentWord === previousWord &&
            !wordCharacterPattern.test(currentWord)
        ) {
            wordsWithMerges[wordsWithMerges.length - 1] += currentWord;
        } else {
            wordsWithMerges.push(currentWord);
        }
    }

    words = wordsWithMerges;

    // Remove words containing only whitespace
    words = words.filter((word) => word.trim() != "");

    const { normalizedFragments, referenceFragments } =
        getNormalizedFragmentsForSpeech(words, language);

    const simplifiedFragments = normalizedFragments.map((word) =>
        simplifyPunctuationCharacters(word).toLocaleLowerCase()
    );

    if ([`'`].includes(simplifiedFragments[0])) {
        normalizedFragments[0] = `()`;
    }

    for (
        let fragmentIndex = 0;
        fragmentIndex < normalizedFragments.length;
        fragmentIndex++
    ) {
        const fragment = normalizedFragments[fragmentIndex];

        const substitutionPhonemes = tryGetFirstLexiconSubstitution(
            simplifiedFragments,
            fragmentIndex,
            lexicons,
            lowerCaseLanguageCode
        );

        if (!substitutionPhonemes) {
            continue;
        }

        phonemizedFragmentsSubstitutions.set(
            fragmentIndex,
            substitutionPhonemes
        );
        const referenceIPA = (
            await textToPhonemes(fragment, espeakOptions.voice, true)
        ).replaceAll("_", " ");
        const referenceKirshenbaum = (
            await textToPhonemes(fragment, espeakOptions.voice, false)
        ).replaceAll("_", "");

        const kirshenbaumPhonemes = substitutionPhonemes
            .map((phone) => ipaPhoneToKirshenbaum(phone))
            .join("");

        logger.logTitledMessage(
            `\nLexicon substitution for '${fragment}'`,
            `IPA: ${substitutionPhonemes.join(" ")} (original: ${referenceIPA}), Kirshenbaum: ${kirshenbaumPhonemes} (reference: ${referenceKirshenbaum})`
        );

        const substitutionPhonemesFragment = ` [[${kirshenbaumPhonemes}]] `;

        normalizedFragments[fragmentIndex] = substitutionPhonemesFragment;
    }

    fragments = referenceFragments;
    preprocessedFragments = normalizedFragments;

    logger.start("Synthesize preprocessed fragments with eSpeak");

    const { rawAudio: referenceSynthesizedAudio, timeline: referenceTimeline } =
        await synthesizeFragments(preprocessedFragments, espeakOptions);

    await logger.startAsync("Build phonemized tokens");

    const phonemizedSentence: string[][][] = [];

    let wordIndex = 0;
    for (const phraseEntry of referenceTimeline) {
        const phrase: string[][] = [];

        for (const wordEntry of phraseEntry.timeline!) {
            wordEntry.text = fragments[wordIndex];

            if (phonemizedFragmentsSubstitutions.has(wordIndex)) {
                phrase.push(phonemizedFragmentsSubstitutions.get(wordIndex)!);
            } else {
                for (const tokenEntry of wordEntry.timeline!) {
                    const tokenPhonemes: string[] = [];

                    for (const phoneme of tokenEntry.timeline!) {
                        if (phoneme.text) {
                            tokenPhonemes.push(phoneme.text);
                        }
                    }

                    if (tokenPhonemes.length > 0) {
                        phrase.push(tokenPhonemes);
                    }
                }
            }

            wordIndex += 1;
        }

        if (phrase.length > 0) {
            phonemizedSentence.push(phrase);
        }
    }

    logger.log(
        phonemizedSentence
            .map((phrase) => phrase.map((word) => word.join(" ")).join(" | "))
            .join(" || ")
    );

    logger.end();

    return {
        referenceSynthesizedAudio,
        referenceTimeline,
        fragments,
        preprocessedFragments,
        phonemizedFragmentsSubstitutions,
        phonemizedSentence,
    };
}

type Lexicon = {
    [shortLanguageCode: string]: LexiconForLanguage;
};

type LexiconForLanguage = {
    [word: string]: LexiconEntry[];
};

type LexiconEntry = {
    pos?: string[];
    case?: LexiconWordCase;

    pronunciation?: {
        espeak?: LexiconPronunciationForLanguageCodes;
        sapi?: LexiconPronunciationForLanguageCodes;
    };

    precededBy?: string[];
    notPrecededBy?: string[];

    succeededBy?: string[];
    notSucceededBy?: string[];

    example?: string;
};

type LexiconWordCase =
    | "any"
    | "capitalized"
    | "uppercase"
    | "lowercase"
    | "titlecase"
    | "camelcase"
    | "pascalcase";
type LexiconPronunciationForLanguageCodes = { [languageCode: string]: string };

function getRawAudioDuration(rawAudio: RawAudio) {
    if (rawAudio.audioChannels.length == 0 || rawAudio.sampleRate == 0) {
        return 0;
    }

    return rawAudio.audioChannels[0].length / rawAudio.sampleRate;
}

function getEmptyRawAudio(channelCount: number, sampleRate: number) {
    const audioChannels = [];

    for (let c = 0; c < channelCount; c++) {
        audioChannels.push(new Float32Array(0));
    }

    const result: RawAudio = { audioChannels, sampleRate };

    return result;
}

type RawAudio = {
    audioChannels: Float32Array[];
    sampleRate: number;
};

function concatTypedArrays<R>(ArrayConstructor: any, arrays: any[]) {
    let totalLength = 0;

    for (const arr of arrays) {
        totalLength += arr.length;
    }

    const result = new ArrayConstructor(totalLength);

    let offset = 0;

    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }

    return <R>result;
}

function writeToStderr(message: any) {
    process.stderr.write(message);
}

function printToStderr(message: any) {
    if (typeof message == "string") {
        writeToStderr(message);
    } else {
        writeToStderr(objToString(message));
    }
}

function logToStderr(message: any) {
    printToStderr(message);
    writeToStderr("\n");
}

function objToString(obj: any) {
    const formattedString = inspect(obj, {
        showHidden: false,
        depth: null,
        colors: false,
        maxArrayLength: null,
        maxStringLength: null,
        compact: 5,
    });

    return formattedString;
}

function roundToDigits(val: number, digits = 3) {
    const multiplier = 10 ** digits;
    return Math.round(val * multiplier) / multiplier;
}

function yieldToEventLoop() {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}

async function resolveModuleScriptPath(moduleName: string) {
    const { resolve } = await import("import-meta-resolve");

    const scriptPath = resolve(moduleName, import.meta.url);

    const { fileURLToPath } = await import("url");

    return fileURLToPath(scriptPath);
}

let currentActiveLogger: Logger | null = null;

declare const chrome: any;
declare const process: any;

class Timer {
    startTime = 0;

    constructor() {
        this.restart();
    }

    restart() {
        this.startTime = Timer.currentTime;
    }

    get elapsedTime(): number {
        // Elapsed time (milliseconds)
        return Timer.currentTime - this.startTime;
    }

    get elapsedTimeSeconds(): number {
        // Elapsed time (seconds)
        return this.elapsedTime / 1000;
    }

    getElapsedTimeAndRestart(): number {
        const elapsedTime = this.elapsedTime;
        this.restart();
        return elapsedTime;
    }

    logAndRestart(title: string, timePrecision = 3): number {
        const elapsedTime = this.elapsedTime;

        //
        const message = `${title}: ${roundToDigits(elapsedTime, timePrecision)}ms`;
        writeToStderr(message);
        //

        this.restart();

        return elapsedTime;
    }

    static get currentTime(): number {
        if (!this.timestampFunc) {
            this.createGlobalTimestampFunction();
        }

        return this.timestampFunc();
    }

    static get microsecondTimestamp(): number {
        return Math.floor(Timer.currentTime * 1000);
    }

    private static createGlobalTimestampFunction() {
        if (
            typeof process === "object" &&
            typeof process.hrtime === "function"
        ) {
            let baseTimestamp = 0;

            this.timestampFunc = () => {
                const nodeTimeStamp = process.hrtime();
                const millisecondTime =
                    nodeTimeStamp[0] * 1000 + nodeTimeStamp[1] / 1000000;

                return baseTimestamp + millisecondTime;
            };

            baseTimestamp = Date.now() - this.timestampFunc();
        } else if (typeof chrome === "object" && chrome.Interval) {
            const baseTimestamp = Date.now();

            const chromeIntervalObject = new chrome.Interval();
            chromeIntervalObject.start();

            this.timestampFunc = () =>
                baseTimestamp + chromeIntervalObject.microseconds() / 1000;
        } else if (typeof performance === "object" && performance.now) {
            const baseTimestamp = Date.now() - performance.now();

            this.timestampFunc = () => baseTimestamp + performance.now();
        } else if (Date.now) {
            this.timestampFunc = () => Date.now();
        } else {
            this.timestampFunc = () => new Date().getTime();
        }
    }

    private static timestampFunc: () => number;
}

function logLevelToNumber(logLevel: LogLevel) {
    return logLevels.indexOf(logLevel);
}

function getLogLevel() {
    return "info" as const;
}

function logLevelGreaterOrEqualTo(referenceLevel: LogLevel) {
    return !logLevelSmallerThan(referenceLevel);
}

function logLevelSmallerThan(referenceLevel: LogLevel) {
    return logLevelToNumber(getLogLevel()) < logLevelToNumber(referenceLevel);
}

const logLevels = [
    "silent",
    "output",
    "error",
    "warning",
    "info",
    "trace",
] as const;

type LogLevel = (typeof logLevels)[number];
class Logger {
    private timer = new Timer();
    active = false;

    start(title: string) {
        this.startAsync(title, false);
    }

    async startAsync(title: string, yieldBeforeStart = true) {
        if (currentActiveLogger != null && currentActiveLogger != this) {
            return;
        }

        this.end();

        if (yieldBeforeStart) {
            await yieldToEventLoop();
        }

        if (logLevelGreaterOrEqualTo("info")) {
            writeToStderr(`${title}.. `);
        }

        this.setAsActiveLogger();

        this.timer.restart();
    }

    setAsActiveLogger() {
        this.active = true;
        currentActiveLogger = this;
    }

    unsetAsActiveLogger() {
        this.active = false;
        currentActiveLogger = null;
    }

    end() {
        if (this.active && currentActiveLogger == this) {
            const elapsedTime = this.timer.elapsedTime;

            if (logLevelGreaterOrEqualTo("info")) {
                writeToStderr(`${elapsedTime.toFixed(1)}ms\n`);
            }

            currentActiveLogger = null;
        }

        this.active = false;
    }

    logTitledMessage(title: string, content: any, logLevel: LogLevel = "info") {
        this.log(`${title}: ${content}`, logLevel);
    }

    log(message: any, logLevel: LogLevel = "info") {
        if (logLevelSmallerThan(logLevel)) {
            return;
        }

        if (currentActiveLogger == this || currentActiveLogger == null) {
            logToStderr(message);
        }
    }

    write(message: any, logLevel: LogLevel = "info") {
        if (logLevelSmallerThan(logLevel)) {
            return;
        }

        if (currentActiveLogger == this || currentActiveLogger == null) {
            writeToStderr(message);
        }
    }

    getTimestamp() {
        return Timer.currentTime;
    }
}

type TimelineEntryType =
    | "segment"
    | "paragraph"
    | "sentence"
    | "clause"
    | "phrase"
    | "word"
    | "token"
    | "letter"
    | "phone"
    | "subphone";

type TimelineEntry = {
    type: TimelineEntryType;

    text: string;

    startTime: number;
    endTime: number;

    startOffsetUtf16?: number;
    endOffsetUtf16?: number;

    startOffsetUtf32?: number;
    endOffsetUtf32?: number;

    confidence?: number;

    id?: number;

    timeline?: Timeline;
};

type Timeline = TimelineEntry[];

const readFile = promisify(gracefulFS.readFile);
//const writeFile = promisify(gracefulFS.writeFile)
const readdir = promisify(gracefulFS.readdir);

async function readAndParseJsonFile(jsonFilePath: string, useJson5 = false) {
    const fileContent = await readFile(jsonFilePath, { encoding: "utf-8" });

    if (useJson5) {
        const { default: JSON5 } = await import("json5");

        return JSON5.parse(fileContent);
    } else {
        return JSON.parse(fileContent);
    }
}

function getOnnxSessionOptions(options: OnnxSessionOptions) {
    const onnxOptions: Onnx.InferenceSession.SessionOptions = {
        executionProviders: ["cpu"],
        logSeverityLevel: 3,
    };

    function dmlProviderAvailable() {
        const platform = process.platform;
        const arch = process.arch;

        return platform === "win32" && arch === "x64";
    }

    if (options) {
        if (options.executionProviders != null) {
            let executionProviders = options.executionProviders.filter(
                (provider) => {
                    if (!provider) {
                        return false;
                    }

                    if (provider === "dml" && !dmlProviderAvailable()) {
                        return false;
                    }

                    return true;
                }
            );

            if (!executionProviders.includes("cpu")) {
                executionProviders.push("cpu");
            }

            executionProviders = Array.from(new Set(executionProviders));

            onnxOptions.executionProviders = executionProviders as any;
        } else if (options.enableGPU === true && dmlProviderAvailable()) {
            onnxOptions.executionProviders = ["dml", "cpu"];
        }

        if (options.logSeverityLevel != null) {
            onnxOptions.logSeverityLevel = options.logSeverityLevel;
        }
    }

    return onnxOptions;
}

interface OnnxSessionOptions {
    enableGPU?: boolean;
    executionProviders?: OnnxExecutionProvider[];
    logSeverityLevel?: 0 | 1 | 2 | 3 | 4;
}

type OnnxExecutionProvider = "cpu" | "dml" | "cuda";

interface EspeakOptions {
    voice: string;
    ssml: boolean;
    rate: number;
    pitch: number;
    pitchRange: number;
    useKlatt: boolean;
    insertSeparators: boolean;
}

const defaultEspeakOptions: EspeakOptions = {
    voice: "en-us",
    ssml: false,
    rate: 1.0,
    pitch: 1.0,
    pitchRange: 1.0,
    useKlatt: false,
    insertSeparators: false,
};

const cachedInstanceLookup = new Map<string, VitsTTS>();

class VitsTTS {
    session?: Onnx.InferenceSession;
    metadata?: any;
    phonemeMap?: Map<string, number[]>;

    constructor(
        public readonly voiceName: string,
        public readonly modelPath: string,
        public readonly executionProviders: OnnxExecutionProvider[]
    ) {}

    static async synthesizeSentence(
        text: string,
        voiceName: string,
        modelPath: string,
        lengthScale: number,
        speakerId: number,
        lexicons: Lexicon[],
        executionProviders: OnnxExecutionProvider[]
    ) {
        const cacheLookupKey = modelPath;

        let vitsTTS: VitsTTS | undefined =
            cachedInstanceLookup.get(cacheLookupKey);

        if (!vitsTTS) {
            vitsTTS = new VitsTTS(voiceName, modelPath, executionProviders);

            cachedInstanceLookup.clear();
            cachedInstanceLookup.set(cacheLookupKey, vitsTTS);
        }

        const result = await vitsTTS._synthesizeSentence(
            text,
            lengthScale,
            speakerId,
            lexicons
        );

        return result;
    }

    private async _synthesizeSentence(
        sentence: string,
        lengthScale: number,
        speakerId = 0,
        lexicons?: Lexicon[]
    ) {
        const logger = new Logger();

        await this.initializeIfNeeded();

        await logger.startAsync("Prepare for VITS synthesis");

        const metadata = this.metadata;
        const phonemeMap = this.phonemeMap!;
        const espeakVoice = metadata.espeak.voice as string;
        const languageCode = espeakVoice;
        const outputSampleRate = metadata.audio.sample_rate;
        const baseLengthScale = metadata.inference.length_scale || 1.0;

        lengthScale *= baseLengthScale;

        sentence = //simplifyPunctuationCharacters(sentence.trim())
            sentence
                .replaceAll("(", ", ")
                .replaceAll(")", ", ")
                .replaceAll("—", ", ");

        logger.end();

        const espeakOptions: EspeakOptions = {
            ...defaultEspeakOptions,
            voice: espeakVoice,
            useKlatt: false,
        };

        const {
            referenceSynthesizedAudio,
            referenceTimeline,
            fragments,
            phonemizedFragmentsSubstitutions,
            phonemizedSentence,
        } = await preprocessAndSynthesize(
            sentence,
            languageCode,
            espeakOptions,
            lexicons
        );

        if (phonemizedSentence.length == 0) {
            logger.end();

            return {
                rawAudio: getEmptyRawAudio(1, outputSampleRate),
                timeline: [],
                referenceSynthesizedAudio: getEmptyRawAudio(
                    1,
                    outputSampleRate
                ),
                referenceTimeline: [] as Timeline,
            };
        }

        await logger.startAsync("Encode phonemes to identifiers");

        const clauseEndBreaker = ",";
        let sentenceEndBreaker = ".";

        if (sentence.endsWith("?") || sentence.endsWith(`?"`)) {
            sentenceEndBreaker = "?";
        } else if (sentence.endsWith("!") || sentence.endsWith(`!"`)) {
            sentenceEndBreaker = "!";
        }

        const phonemeCharacterSeparatorId = phonemeMap.get("_")!;
        const wordSeparatorId = phonemeMap.get(" ")!;
        const startId = phonemeMap.get("^")!;
        const endId = phonemeMap.get("$")!;

        const clauseEndBreakerId = phonemeMap.get(clauseEndBreaker)!;
        const sentenceEndBreakerId = phonemeMap.get(sentenceEndBreaker)!;

        const ids: number[] = [...startId, ...phonemeCharacterSeparatorId];

        for (
            let clauseIndex = 0;
            clauseIndex < phonemizedSentence.length;
            clauseIndex++
        ) {
            const clause = phonemizedSentence[clauseIndex];

            for (const word of clause) {
                for (const phoneme of word) {
                    for (const phonemeCharacter of phoneme) {
                        const id = phonemeMap.get(phonemeCharacter);

                        if (id == null) {
                            continue;
                        }

                        ids.push(...id, ...phonemeCharacterSeparatorId);
                    }
                }

                if (clauseIndex < phonemizedSentence.length - 1) {
                    ids.push(
                        ...wordSeparatorId,
                        ...phonemeCharacterSeparatorId
                    );
                }
            }

            if (clauseIndex < phonemizedSentence.length - 1) {
                ids.push(...clauseEndBreakerId, ...phonemeCharacterSeparatorId);
            }
        }

        ids.push(
            ...sentenceEndBreakerId,
            ...phonemeCharacterSeparatorId,
            ...endId
        );

        const bigIntIds = new BigInt64Array(ids.map((id) => BigInt(id)));
        const idLengths = new BigInt64Array([BigInt(bigIntIds.length)]);

        await logger.startAsync("Generate audio using synthesis model");

        const inputTensor = new Onnx.Tensor("int64", bigIntIds, [
            1,
            bigIntIds.length,
        ]);
        const inputLengthsTensor = new Onnx.Tensor("int64", idLengths, [1]);
        const scalesTensor = new Onnx.Tensor(
            "float32",
            [
                metadata.inference.noise_scale,
                lengthScale,
                metadata.inference.noise_w,
            ],
            [3]
        );
        const speakerIdTensor = new Onnx.Tensor(
            "int64",
            new BigInt64Array([BigInt(speakerId)]),
            [1]
        );

        const modelInputs = {
            input: inputTensor,
            input_lengths: inputLengthsTensor,
            scales: scalesTensor,
            sid: speakerIdTensor,
        };

        const modelResults = await this.session!.run(modelInputs);
        const modelOutput = modelResults["output"];

        const modelOutputAudioSamples = modelOutput["data"] as Float32Array;

        const synthesizedAudio: RawAudio = {
            audioChannels: [modelOutputAudioSamples],
            sampleRate: outputSampleRate,
        };

        await logger.startAsync("Align with reference synthesized audio");

        const referenceWordTimeline = referenceTimeline.flatMap(
            (clause) => clause.timeline!
        );

        const dtwWindowDuration = Math.max(
            5,
            Math.ceil(0.2 * getRawAudioDuration(synthesizedAudio))
        );
        const mappedTimeline = await alignUsingDtw(
            synthesizedAudio,
            referenceSynthesizedAudio,
            referenceWordTimeline,
            ["high"],
            [dtwWindowDuration]
        );

        logger.end();

        return {
            rawAudio: synthesizedAudio,
            timeline: mappedTimeline,
            referenceSynthesizedAudio,
            referenceTimeline,
        };
    }

    async initializeIfNeeded() {
        if (this.session) {
            return;
        }

        const logger = new Logger();
        await logger.startAsync("Initialize VITS ONNX synthesis model");

        const filesInModelPath = await readdir(this.modelPath);
        const onnxModelFilename = filesInModelPath.find((filename) =>
            filename.endsWith(".onnx")
        );

        if (!onnxModelFilename) {
            throw new Error(
                `Couldn't file any ONNX model file in ${this.modelPath}`
            );
        }

        const onnxModelFilepath = path.join(this.modelPath, onnxModelFilename);

        const onnxSessionOptions = getOnnxSessionOptions({
            executionProviders: this.executionProviders,
        });

        this.session = await Onnx.InferenceSession.create(
            onnxModelFilepath,
            onnxSessionOptions
        );
        this.metadata = await readAndParseJsonFile(`${onnxModelFilepath}.json`);

        this.phonemeMap = new Map<string, number[]>();

        for (const key in this.metadata.phoneme_id_map) {
            this.phonemeMap.set(key, this.metadata.phoneme_id_map[key]);
        }

        logger.end();
    }
}

function getSamplePeakAmplitude(audioChannels: Float32Array[]) {
    let maxAmplitude = 0.00001;

    for (const channelSamples of audioChannels) {
        for (const sample of channelSamples) {
            maxAmplitude = Math.max(maxAmplitude, Math.abs(sample));
        }
    }

    return maxAmplitude;
}

function getSamplePeakDecibels(audioChannels: Float32Array[]) {
    return gainFactorToDecibels(getSamplePeakAmplitude(audioChannels));
}

function gainFactorToDecibels(gainFactor: number) {
    return gainFactor <= 0.00001 ? -100 : 20.0 * Math.log10(gainFactor);
}

function splitToSentences(text: string, langCode: string): string[] {
    const shortLangCode = getShortLanguageCode(langCode || "");

    return CldrSegmentation.sentenceSplit(
        text,
        CldrSegmentation.suppressions[shortLangCode]
    );
}

type LanguageDetectionResults = LanguageDetectionResultsEntry[];

interface LanguageDetectionResultsEntry {
    language: string;
    languageName: string;
    probability: number;
}

async function detectLanguage(text: string) {
    const tinyldResults = detectAll(text);

    const results: LanguageDetectionResults = tinyldResults.map((result) => ({
        language: result.lang,
        languageName: languageCodeToName(result.lang),
        probability: result.accuracy,
    }));

    return results;
}

interface TextLanguageDetectionOptions {
    defaultLanguage?: string;
    fallbackThresholdProbability?: number;
}

interface TextLanguageDetectionResult {
    detectedLanguage: string;
    detectedLanguageName: string;
    detectedLanguageProbabilities: LanguageDetectionResults;
}

const defaultTextLanguageDetectionOptions: TextLanguageDetectionOptions = {
    defaultLanguage: "en",
    fallbackThresholdProbability: 0.05,
};

async function detectTextLanguage(
    input: string,
    options: TextLanguageDetectionOptions
): Promise<TextLanguageDetectionResult> {
    const logger = new Logger();

    options = extendDeep(defaultTextLanguageDetectionOptions, options);

    const defaultLanguage = options.defaultLanguage!;
    const fallbackThresholdProbability = options.fallbackThresholdProbability!;

    let detectedLanguageProbabilities: LanguageDetectionResults;

    logger.start(`Initialize language detection module`);

    detectedLanguageProbabilities = await detectLanguage(input);

    let detectedLanguage: string;

    if (
        detectedLanguageProbabilities.length == 0 ||
        detectedLanguageProbabilities[0].probability <
            fallbackThresholdProbability
    ) {
        detectedLanguage = defaultLanguage;
    } else {
        detectedLanguage = detectedLanguageProbabilities[0].language;
    }

    logger.end();

    return {
        detectedLanguage,
        detectedLanguageName: languageCodeToName(detectedLanguage),
        detectedLanguageProbabilities,
    };
}

function clampFloatSample(floatSample: number) {
    if (floatSample < -1.0) {
        return -1.0;
    } else if (floatSample > 1.0) {
        return 1.0;
    } else {
        return floatSample;
    }
}

function float32ToInt16Pcm(input: Float32Array) {
    const output = new Int16Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = clampFloatSample(input[i]);
        output[i] = (sample < 0 ? sample * 32768 : sample * 32767) | 0;
    }

    return output;
}

// Typed arrays to Buffer (little endian) conversions
//
// The faster conversion methods (other than the methods for int8) would only work correctly
// on little-endian architectures, since they assume the byte order of the underlying architecture.
//
// Since Echogarden only supports little-endian architectures, this shouldn't matter.

// int8 <-> bufferLE
function int8ToBuffer(int8s: Int8Array) {
    return Buffer.copyBytesFrom(int8s);
}

function int8ToBuffer_Slow(int8s: Int8Array) {
    const buffer = Buffer.alloc(int8s.length);

    for (let i = 0; i < int8s.length; i++) {
        buffer[i] = int8s[i] + 128;
    }

    return buffer;
}

function bufferToInt8(buffer: Buffer) {
    return new Int8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function bufferToInt8_Slow(buffer: Buffer) {
    const result = new Int8Array(buffer.length);

    for (let i = 0; i < result.length; i++) {
        result[i] = buffer[i] - 128;
    }

    return result;
}

// int16 <-> bufferLE
function int16ToBufferLE(int16s: Int16Array) {
    return Buffer.copyBytesFrom(int16s);
}

function int16ToBufferLE_Slow(int16s: Int16Array) {
    const buffer = Buffer.alloc(int16s.length * 2);

    for (let i = 0; i < int16s.length; i++) {
        buffer.writeInt16LE(int16s[i], i * 2);
    }

    return buffer;
}

function bufferLEToInt16(buffer: Buffer) {
    return new Int16Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 2
    );
}

function bufferLEToInt16_Slow(buffer: Buffer) {
    const result = new Int16Array(buffer.length / 2);

    for (let i = 0; i < result.length; i++) {
        result[i] = buffer.readInt16LE(i * 2);
    }

    return result;
}

// int24 <-> bufferLE (uses int32 for storage)
function int24ToBufferLE(int24s: Int32Array) {
    const buffer = Buffer.alloc(int24s.length * 3);

    for (let i = 0; i < int24s.length; i++) {
        const val = int24s[i];
        const encodedVal = val < 0 ? val + 0x1000000 : val;

        buffer[i * 3 + 0] = (encodedVal >> 0) & 0xff;
        buffer[i * 3 + 1] = (encodedVal >> 8) & 0xff;
        buffer[i * 3 + 2] = (encodedVal >> 16) & 0xff;
    }

    return buffer;
}

function bufferLEToInt24(buffer: Buffer) {
    const result = new Int32Array(buffer.length / 3);

    for (let i = 0; i < result.length; i++) {
        const b0 = buffer[i * 3 + 0];
        const b1 = buffer[i * 3 + 1];
        const b2 = buffer[i * 3 + 2];

        const encodedVal = (b0 << 0) + (b1 << 8) + (b2 << 16);
        result[i] = encodedVal > 0x800000 ? encodedVal - 0x1000000 : encodedVal;
    }

    return result;
}

// int32 <-> bufferLE
function int32ToBufferLE(int32s: Int32Array) {
    return Buffer.copyBytesFrom(int32s);
}

function int32ToBufferLE_Slow(int32s: Int32Array) {
    const buffer = Buffer.alloc(int32s.length * 4);

    for (let i = 0; i < int32s.length; i++) {
        buffer.writeInt32LE(int32s[i], i * 4);
    }

    return buffer;
}

function bufferLEToInt32(buffer: Buffer) {
    return new Int32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 4
    );
}

function bufferLEToInt32_Slow(buffer: Buffer) {
    const result = new Int32Array(buffer.length / 4);

    for (let i = 0; i < result.length; i++) {
        result[i] = buffer.readInt32LE(i * 4);
    }

    return result;
}

// float32 <-> bufferLE
function float32ToBufferLE(float32s: Float32Array) {
    return Buffer.copyBytesFrom(float32s);
}

function float32ToBufferLE_Slow(float32s: Float32Array) {
    const buffer = Buffer.alloc(float32s.length * 4);

    for (let i = 0; i < float32s.length; i++) {
        buffer.writeFloatLE(float32s[i], i * 4);
    }

    return buffer;
}

function bufferLEToFloat32(buffer: Buffer) {
    return new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 4
    );
}

function bufferLEToFloat32_Slow(buffer: Buffer) {
    const result = new Float32Array(buffer.length / 4);

    for (let i = 0; i < result.length; i++) {
        result[i] = buffer.readFloatLE(i * 4);
    }

    return result;
}

// float64 <-> bufferLE
function float64ToBufferLE(float64s: Float64Array) {
    return Buffer.copyBytesFrom(float64s);
}

function float64ToBufferLE_Slow(float64s: Float64Array) {
    const buffer = Buffer.alloc(float64s.length * 8);

    for (let i = 0; i < float64s.length; i++) {
        buffer.writeDoubleLE(float64s[i], i * 8);
    }

    return buffer;
}

function bufferLEToFloat64(buffer: Buffer) {
    return new Float64Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 8
    );
}

function bufferLEToFloat64_Slow(buffer: Buffer) {
    const result = new Float64Array(buffer.length / 8);

    for (let i = 0; i < result.length; i++) {
        result[i] = buffer.readDoubleLE(i * 8);
    }

    return result;
}

// float64 <-> float32
function float64Tofloat32(float64s: Float64Array) {
    return Float32Array.from(float64s);
}

function float32Tofloat64(float32s: Float32Array) {
    return Float64Array.from(float32s);
}

function interleaveChannels(channels: Float32Array[]) {
    const channelCount = channels.length;

    if (channelCount === 0) {
        throw new Error("Empty channel array received");
    }

    if (channelCount === 1) {
        return channels[0];
    }

    const sampleCount = channels[0].length;
    const result = new Float32Array(sampleCount * channelCount);

    let writeIndex = 0;

    for (let i = 0; i < sampleCount; i++) {
        for (let c = 0; c < channelCount; c++) {
            result[writeIndex] = channels[c][i];
            writeIndex += 1;
        }
    }

    return result;
}

function float32ToInt8Pcm(input: Float32Array) {
    const output = new Int8Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = clampFloatSample(input[i]);
        output[i] = (sample < 0 ? sample * 128 : sample * 127) | 0;
    }

    return output;
}

function float32ToInt24Pcm(input: Float32Array) {
    const output = new Int32Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = clampFloatSample(input[i]);
        output[i] = (sample < 0 ? sample * 8388608 : sample * 8388607) | 0;
    }

    return output;
}

function float32ToInt32Pcm(input: Float32Array) {
    const output = new Int32Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = clampFloatSample(input[i]);
        output[i] =
            (sample < 0 ? sample * 2147483648 : sample * 2147483647) | 0;
    }

    return output;
}

function encodeToAudioBuffer(
    audioChannels: Float32Array[],
    targetBitDepth: BitDepth = 16,
    targetSampleFormat: SampleFormat = SampleFormat.PCM
) {
    const interleavedChannels = interleaveChannels(audioChannels);

    audioChannels = []; // Zero the array references to allow the GC to free up memory, if possible

    if (targetSampleFormat === SampleFormat.PCM) {
        if (targetBitDepth === 8) {
            return int8ToBuffer(float32ToInt8Pcm(interleavedChannels));
        } else if (targetBitDepth === 16) {
            return int16ToBufferLE(float32ToInt16Pcm(interleavedChannels));
        } else if (targetBitDepth === 24) {
            return int24ToBufferLE(float32ToInt24Pcm(interleavedChannels));
        } else if (targetBitDepth === 32) {
            return int32ToBufferLE(float32ToInt32Pcm(interleavedChannels));
        } else {
            throw new Error(`Unsupported PCM bit depth: ${targetBitDepth}`);
        }
    } else if (targetSampleFormat === SampleFormat.Float) {
        if (targetBitDepth === 32) {
            return float32ToBufferLE(interleavedChannels);
        } else if (targetBitDepth === 64) {
            return float64ToBufferLE(float32Tofloat64(interleavedChannels));
        } else {
            throw new Error(`Unsupported float bit depth: ${targetBitDepth}`);
        }
    } else if (targetSampleFormat === SampleFormat.Alaw) {
        if (targetBitDepth === 8) {
            return Buffer.from(
                AlawMulaw.alaw.encode(float32ToInt16Pcm(interleavedChannels))
            );
        } else {
            throw new Error(`Unsupported alaw bit depth: ${targetBitDepth}`);
        }
    } else if (targetSampleFormat === SampleFormat.Mulaw) {
        if (targetBitDepth === 8) {
            return Buffer.from(
                AlawMulaw.mulaw.encode(float32ToInt16Pcm(interleavedChannels))
            );
        } else {
            throw new Error(`Unsupported mulaw bit depth: ${targetBitDepth}`);
        }
    } else {
        throw new Error(`Unsupported audio format: ${targetSampleFormat}`);
    }
}

class WaveFormat {
    // 24 bytes total for PCM, 26 for float
    sampleFormat: SampleFormat; // 2 bytes LE
    channelCount: number; // 2 bytes LE
    sampleRate: number; // 4 bytes LE
    get byteRate() {
        return this.sampleRate * this.bytesPerSample * this.channelCount;
    } // 4 bytes LE
    get blockAlign() {
        return this.bytesPerSample * this.channelCount;
    } // 2 bytes LE
    bitDepth: BitDepth; // 2 bytes LE

    speakerPositionMask: number; // 4 bytes LE
    get guid() {
        return sampleFormatToGuid[this.sampleFormat];
    } // 16 bytes BE

    // helpers:
    get bytesPerSample() {
        return this.bitDepth / 8;
    }

    constructor(
        channelCount: number,
        sampleRate: number,
        bitDepth: BitDepth,
        sampleFormat: SampleFormat,
        speakerPositionMask = 0
    ) {
        this.sampleFormat = sampleFormat;
        this.channelCount = channelCount;
        this.sampleRate = sampleRate;
        this.bitDepth = bitDepth;

        this.speakerPositionMask = speakerPositionMask;
    }

    serialize(useExtensibleFormat: boolean) {
        let sampleFormatId = this.sampleFormat;

        if (useExtensibleFormat) {
            sampleFormatId = 65534 as number;
        }

        const serializedSize = sampleFormatToSerializedSize[sampleFormatId];

        const result = Buffer.alloc(serializedSize);

        result.write("fmt ", 0, "ascii"); // + 4
        result.writeUint32LE(serializedSize - 8, 4); // + 4

        result.writeUint16LE(sampleFormatId, 8); // + 2
        result.writeUint16LE(this.channelCount, 10); // + 2
        result.writeUint32LE(this.sampleRate, 12); // + 4
        result.writeUint32LE(this.byteRate, 16); // + 4
        result.writeUint16LE(this.blockAlign, 20); // + 2
        result.writeUint16LE(this.bitDepth, 22); // + 2

        if (useExtensibleFormat) {
            result.writeUint16LE(serializedSize - 26, 24); // + 2 (extension size)
            result.writeUint16LE(this.bitDepth, 26); // + 2 (valid bits per sample)
            result.writeUint32LE(this.speakerPositionMask, 28); // + 2 (speaker position mask)

            if (
                this.sampleFormat == SampleFormat.PCM ||
                this.sampleFormat == SampleFormat.Float
            ) {
                result.set(Buffer.from(this.guid, "hex"), 32);
            } else {
                throw new Error(
                    `Extensible format is not supported for sample format ${this.sampleFormat}`
                );
            }
        }

        return result;
    }

    static deserializeFrom(formatChunkBody: Buffer) {
        // chunkBody should not include the first 8 bytes
        let sampleFormat = formatChunkBody.readUint16LE(0); // + 2
        const channelCount = formatChunkBody.readUint16LE(2); // + 2
        const sampleRate = formatChunkBody.readUint32LE(4); // + 4
        const bitDepth = formatChunkBody.readUint16LE(14);
        let speakerPositionMask = 0;

        if (sampleFormat == 65534) {
            if (formatChunkBody.length < 40) {
                throw new Error(
                    `Format subchunk specifies a format id of 65534 (extensible) but its body size is ${formatChunkBody.length} bytes, which is smaller than the minimum expected of 40 bytes`
                );
            }

            speakerPositionMask = formatChunkBody.readUint16LE(20);

            const guid = formatChunkBody.subarray(24, 40).toString("hex");

            if (guid == sampleFormatToGuid[SampleFormat.PCM]) {
                sampleFormat = SampleFormat.PCM;
            } else if (guid == sampleFormatToGuid[SampleFormat.Float]) {
                sampleFormat = SampleFormat.Float;
            } else {
                throw new Error(
                    `Unsupported format GUID in extended format subchunk: ${guid}`
                );
            }
        }

        if (sampleFormat == SampleFormat.PCM) {
            if (
                bitDepth != 8 &&
                bitDepth != 16 &&
                bitDepth != 24 &&
                bitDepth != 32
            ) {
                throw new Error(
                    `PCM audio has a bit depth of ${bitDepth}, which is not supported`
                );
            }
        } else if (sampleFormat == SampleFormat.Float) {
            if (bitDepth != 32 && bitDepth != 64) {
                throw new Error(
                    `IEEE float audio has a bit depth of ${bitDepth}, which is not supported`
                );
            }
        } else if (sampleFormat == SampleFormat.Alaw) {
            if (bitDepth != 8) {
                throw new Error(
                    `Alaw audio has a bit depth of ${bitDepth}, which is not supported`
                );
            }
        } else if (sampleFormat == SampleFormat.Mulaw) {
            if (bitDepth != 8) {
                throw new Error(
                    `Mulaw audio has a bit depth of ${bitDepth}, which is not supported`
                );
            }
        } else {
            throw new Error(
                `Wave audio format id ${sampleFormat} is not supported`
            );
        }

        return new WaveFormat(
            channelCount,
            sampleRate,
            bitDepth,
            sampleFormat,
            speakerPositionMask
        );
    }
}

function encodeWave(
    rawAudio: RawAudio,
    bitDepth: BitDepth = 16,
    sampleFormat: SampleFormat = SampleFormat.PCM,
    speakerPositionMask = 0
) {
    const audioChannels = rawAudio.audioChannels;
    const sampleRate = rawAudio.sampleRate;

    const audioBuffer = encodeToAudioBuffer(
        audioChannels,
        bitDepth,
        sampleFormat
    );
    const audioDataLength = audioBuffer.length;

    const shouldUseExtensibleFormat = bitDepth > 16 || audioChannels.length > 2;

    const formatSubChunk = new WaveFormat(
        audioChannels.length,
        sampleRate,
        bitDepth,
        sampleFormat,
        speakerPositionMask
    );
    const formatSubChunkBuffer = formatSubChunk.serialize(
        shouldUseExtensibleFormat
    );

    const dataSubChunkBuffer = Buffer.alloc(4 + 4 + audioDataLength);
    dataSubChunkBuffer.write("data", 0, "ascii");
    const dataChunkLength = Math.min(audioDataLength, 4294967295); // Ensure large data chunk length is clipped to max
    dataSubChunkBuffer.writeUint32LE(dataChunkLength, 4);
    dataSubChunkBuffer.set(audioBuffer, 8);

    const riffChunkHeaderBuffer = Buffer.alloc(12);
    riffChunkHeaderBuffer.write("RIFF", 0, "ascii");
    const riffChunkLength = Math.min(
        4 + formatSubChunkBuffer.length + dataSubChunkBuffer.length,
        4294967295
    ); // Ensure large RIFF chunk length is clipped to max
    riffChunkHeaderBuffer.writeUint32LE(riffChunkLength, 4);
    riffChunkHeaderBuffer.write("WAVE", 8, "ascii");

    return Buffer.concat([
        riffChunkHeaderBuffer,
        formatSubChunkBuffer,
        dataSubChunkBuffer,
    ]);
}

enum SampleFormat {
    PCM = 1,
    Float = 3,
    Alaw = 6,
    Mulaw = 7,
}

type BitDepth = 8 | 16 | 24 | 32 | 64;

const sampleFormatToSerializedSize = {
    [SampleFormat.PCM]: 24,
    [SampleFormat.Float]: 26,
    [SampleFormat.Alaw]: 26,
    [SampleFormat.Mulaw]: 26,
    65534: 48,
};

const sampleFormatToGuid = {
    [SampleFormat.PCM]: "0100000000001000800000aa00389b71",
    [SampleFormat.Float]: "0300000000001000800000aa00389b71",
    [SampleFormat.Alaw]: "",
    [SampleFormat.Mulaw]: "",
};

function encodeRawAudioToWave(
    rawAudio: RawAudio,
    bitDepth: BitDepth = 16,
    sampleFormat: SampleFormat = SampleFormat.PCM,
    speakerPositionMask = 0
) {
    return encodeWave(rawAudio, bitDepth, sampleFormat, speakerPositionMask);
}

function languageCodeToName(languageCode: string) {
    const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

    let translatedLanguageName: string | undefined;

    try {
        translatedLanguageName = languageNames.of(languageCode);
    } catch (e) {}

    return translatedLanguageName || "Unknown";
}

function formatLanguageCodeWithName(languageCode: string, styleId: 1 | 2 = 1) {
    if (styleId == 1) {
        return `${languageCodeToName(languageCode)} (${languageCode})`;
    } else {
        return `${languageCode}, ${languageCodeToName(languageCode)}`;
    }
}

const cancelCurrentTask = false;

function shouldCancelCurrentTask() {
    return cancelCurrentTask;
}

function trimAudioStart(
    audioSamples: Float32Array,
    targetStartSilentSampleCount = 0,
    amplitudeThresholdDecibels = defaultSilenceThresholdDecibels
) {
    const silentSampleCount = getStartingSilentSampleCount(
        audioSamples,
        amplitudeThresholdDecibels
    );

    const trimmedAudio = audioSamples.subarray(
        silentSampleCount,
        audioSamples.length
    );
    const restoredSilence = new Float32Array(targetStartSilentSampleCount);

    const trimmedAudioSamples = concatFloat32Arrays([
        restoredSilence,
        trimmedAudio,
    ]);

    return trimmedAudioSamples;
}

function trimAudioEnd(
    audioSamples: Float32Array,
    targetEndSilentSampleCount = 0,
    amplitudeThresholdDecibels = defaultSilenceThresholdDecibels
) {
    if (audioSamples.length === 0) {
        return new Float32Array(0);
    }

    const silentSampleCount = getEndingSilentSampleCount(
        audioSamples,
        amplitudeThresholdDecibels
    );

    const trimmedAudio = audioSamples.subarray(
        0,
        audioSamples.length - silentSampleCount
    );
    const restoredSilence = new Float32Array(targetEndSilentSampleCount);

    const trimmedAudioSamples = concatFloat32Arrays([
        trimmedAudio,
        restoredSilence,
    ]);

    return trimmedAudioSamples;
}

function addTimeOffsetToTimeline(targetTimeline: Timeline, timeOffset: number) {
    if (!targetTimeline) {
        return targetTimeline;
    }

    const newTimeline = deepClone(targetTimeline);

    for (const segmentTimelineEntry of newTimeline) {
        segmentTimelineEntry.startTime = Math.max(
            segmentTimelineEntry.startTime + timeOffset,
            0
        );
        segmentTimelineEntry.endTime = Math.max(
            segmentTimelineEntry.endTime + timeOffset,
            0
        );

        if (segmentTimelineEntry.timeline) {
            segmentTimelineEntry.timeline = addTimeOffsetToTimeline(
                segmentTimelineEntry.timeline,
                timeOffset
            );
        }
    }

    return newTimeline;
}

async function synthesizeSegments(
    segments: string[],
    options: SynthesisOptions,
    onSegment?: SynthesisSegmentEvent,
    onSentence?: SynthesisSegmentEvent
): Promise<SynthesisResult> {
    const logger = new Logger();
    options = extendDeep(defaultSynthesisOptions, options);

    if (!options.language && !options.voice) {
        logger.start("No language or voice specified. Detect language");

        const segmentsPlainText = segments;

        const { detectedLanguage } = await detectTextLanguage(
            segmentsPlainText.join("\n\n"),
            options.languageDetection || {}
        );

        options.language = detectedLanguage;

        logger.end();
    }

    const { bestMatchingVoice } = await requestVoiceList(options);

    if (!bestMatchingVoice) {
        throw new Error("No matching voice found 1");
    }

    options.voice = bestMatchingVoice.name;

    if (!options.language) {
        options.language = bestMatchingVoice.languages[0];
    }

    logger.end();
    logger.logTitledMessage(
        "Selected voice",
        `'${options.voice}' (${formatLanguageCodeWithName(bestMatchingVoice.languages[0], 2)})`
    );

    const segmentsRawAudio: RawAudio[] = [];
    const segmentsTimelines: Timeline[] = [];

    const timeline: Timeline = [];

    let peakDecibelsSoFar = -100;

    let timeOffset = 0;

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
        const segmentText = segments[segmentIndex].trim();

        logger.log(
            `\n${`Synthesizing segment ${segmentIndex + 1}/${segments.length}`}: '${segmentText}'`
        );

        const segmentStartTime = timeOffset;

        const segmentEntry: TimelineEntry = {
            type: "segment",
            text: segmentText,
            startTime: timeOffset,
            endTime: -1,
            timeline: [],
        };

        let sentences: string[];

        if (!options.ssml) {
            sentences = splitToSentences(segmentText, options.language!);
            sentences = sentences.filter((sentence) => sentence.trim() != "");

            if (sentences.length == 0) {
                sentences = [""];
            }
        } else {
            sentences = [segmentText];
        }

        const sentencesRawAudio: RawAudio[] = [];
        const sentencesTimelines: Timeline[] = [];

        for (
            let sentenceIndex = 0;
            sentenceIndex < sentences.length;
            sentenceIndex++
        ) {
            await yieldToEventLoop();

            if (shouldCancelCurrentTask()) {
                //log('\n\n\n\n\nCANCELED\n\n\n\n')
                throw new Error("Canceled");
            }

            const sentenceText = sentences[sentenceIndex].trim();

            logger.log(
                `\n${`Synthesizing sentence ${sentenceIndex + 1}/${sentences.length}`}: "${sentenceText}"`
            );

            const sentenceStartTime = timeOffset;

            let sentencetSynthesisOptions: SynthesisOptions = {
                postProcessing: { normalizeAudio: false },
            };
            sentencetSynthesisOptions = extendDeep(
                options,
                sentencetSynthesisOptions
            );

            const {
                synthesizedAudio: sentenceRawAudio,
                timeline: sentenceTimeline,
            } = await synthesizeSegment(
                sentenceText,
                sentencetSynthesisOptions
            );

            const endPause =
                sentenceIndex == sentences.length - 1
                    ? options.segmentEndPause!
                    : options.sentenceEndPause!;
            sentenceRawAudio.audioChannels[0] = trimAudioEnd(
                sentenceRawAudio.audioChannels[0],
                endPause * sentenceRawAudio.sampleRate
            );

            sentencesRawAudio.push(sentenceRawAudio);

            if (sentenceTimeline.length > 0) {
                sentencesTimelines.push(sentenceTimeline);
            }

            const sentenceAudioLength =
                sentenceRawAudio.audioChannels[0].length /
                sentenceRawAudio.sampleRate;

            timeOffset += sentenceAudioLength;

            const sentenceTimelineWithOffset = addTimeOffsetToTimeline(
                sentenceTimeline,
                sentenceStartTime
            );

            const sentenceEndTime = timeOffset - endPause;

            segmentEntry.timeline!.push({
                type: "sentence",
                text: sentenceText,
                startTime: sentenceStartTime,
                endTime: sentenceEndTime,
                timeline: sentenceTimelineWithOffset,
            });

            peakDecibelsSoFar = Math.max(
                peakDecibelsSoFar,
                getSamplePeakDecibels(sentenceRawAudio.audioChannels)
            );

            const sentenceAudio =
                await convertToTargetCodecIfNeeded(sentenceRawAudio);

            if (onSentence) {
                await onSentence({
                    index: sentenceIndex,
                    total: sentences.length,
                    audio: sentenceAudio,
                    timeline: sentenceTimeline,
                    transcript: sentenceText,
                    language: options.language!,
                    peakDecibelsSoFar,
                });
            }
        }

        segmentEntry.endTime =
            segmentEntry.timeline?.[segmentEntry.timeline.length - 1]
                ?.endTime || timeOffset;

        logger.end();

        logger.start(`Merge and postprocess sentences`);

        let segmentRawAudio: RawAudio;

        if (sentencesRawAudio.length > 0) {
            const joinedAudioBuffers = concatAudioSegments(
                sentencesRawAudio.map((part) => part.audioChannels)
            );
            segmentRawAudio = {
                audioChannels: joinedAudioBuffers,
                sampleRate: sentencesRawAudio[0].sampleRate,
            };
        } else {
            segmentRawAudio = getEmptyRawAudio(1, 24000);
        }

        segmentsRawAudio.push(segmentRawAudio);

        timeline.push(segmentEntry);
        const segmentTimelineWithoutOffset = addTimeOffsetToTimeline(
            segmentEntry.timeline!,
            -segmentStartTime
        );
        segmentsTimelines.push(segmentTimelineWithoutOffset);

        const segmentAudio =
            await convertToTargetCodecIfNeeded(segmentRawAudio);

        logger.end();

        if (onSegment) {
            await onSegment({
                index: segmentIndex,
                total: segments.length,
                audio: segmentAudio,
                timeline: segmentTimelineWithoutOffset,
                transcript: segmentText,
                language: options.language!,
                peakDecibelsSoFar,
            });
        }
    }

    logger.start(`\nMerge and postprocess segments`);
    let resultRawAudio: RawAudio;

    if (segmentsRawAudio.length > 0) {
        const joinedAudioBuffers = concatAudioSegments(
            segmentsRawAudio.map((part) => part.audioChannels)
        );
        resultRawAudio = {
            audioChannels: joinedAudioBuffers,
            sampleRate: segmentsRawAudio[0].sampleRate,
        };

        if (options.postProcessing!.normalizeAudio) {
            resultRawAudio = normalizeAudioLevel(
                resultRawAudio,
                options.postProcessing!.targetPeak,
                options.postProcessing!.maxGainIncrease
            );
        } else {
            resultRawAudio = attenuateIfClipping(resultRawAudio);
        }
    } else {
        resultRawAudio = getEmptyRawAudio(1, 24000);
    }

    async function convertToTargetCodecIfNeeded(rawAudio: RawAudio) {
        const targetCodec = options.outputAudioFormat?.codec;

        let output: RawAudio | Buffer;

        if (targetCodec) {
            logger.start(`Convert to ${targetCodec} codec`);

            if (targetCodec == "wav") {
                output = encodeRawAudioToWave(rawAudio);
            } else {
                const ffmpegOptions = getDefaultFFMpegOptionsForSpeech(
                    targetCodec,
                    options.outputAudioFormat?.bitrate
                );
                output = await encodeFromChannels(rawAudio, ffmpegOptions);
            }
        } else {
            output = rawAudio;
        }

        return output;
    }

    const resultAudio = await convertToTargetCodecIfNeeded(resultRawAudio);

    logger.end();

    return {
        audio: resultAudio,
        timeline,
        language: options.language,
        voice: options.voice,
    };
}

async function encodeFromChannels(
    rawAudio: RawAudio,
    outputOptions: FFMpegOutputOptions
) {
    return transcode(encodeRawAudioToWave(rawAudio), outputOptions);
}

function getDefaultFFMpegOptionsForSpeech(
    fileExtension: string,
    customBitrate?: number
) {
    let ffmpegOptions: FFMpegOutputOptions;

    if (fileExtension == "mp3") {
        ffmpegOptions = {
            format: "mp3",
            codec: "libmp3lame",
            bitrate: 64,
            customOptions: [],
        };
    } else if (fileExtension == "opus") {
        ffmpegOptions = {
            codec: "libopus",
            bitrate: 48,
            customOptions: [],
        };
    } else if (fileExtension == "m4a") {
        ffmpegOptions = {
            format: "mp4",
            codec: "aac",
            bitrate: 48,
            customOptions: [
                "-profile:a",
                "aac_low",
                "-movflags",
                "frag_keyframe+empty_moov",
            ],
        };
    } else if (fileExtension == "ogg") {
        ffmpegOptions = {
            codec: "libvorbis",
            bitrate: 48,
            customOptions: [],
        };
    } else if (fileExtension == "flac") {
        ffmpegOptions = {
            format: "flac",
            customOptions: ["-compression_level", "6"],
        };
    } else {
        throw new Error(`Unsupported codec extension: '${fileExtension}'`);
    }

    if (customBitrate != null) {
        ffmpegOptions.bitrate = customBitrate;
    }

    return ffmpegOptions;
}

function concatAudioSegments(audioSegments: Float32Array[][]) {
    if (audioSegments.length == 0) {
        return [];
    }

    const channelCount = audioSegments[0].length;

    const outAudioChannels: Float32Array[] = [];

    for (let i = 0; i < channelCount; i++) {
        const audioSegmentsForChannel = audioSegments.map(
            (segment) => segment[i]
        );

        outAudioChannels.push(concatFloat32Arrays(audioSegmentsForChannel));
    }

    return outAudioChannels;
}

interface SynthesisResult {
    audio: RawAudio | Buffer;
    timeline: Timeline;
    language: string;
    voice: string;
}

interface SynthesisOptions {
    engine?: "vits" | "espeak";
    language?: string;
    voice?: string;
    voiceGender?: VoiceGender;

    speed?: number;
    pitch?: number;
    pitchVariation?: number;

    splitToSentences?: boolean;

    ssml?: boolean;

    segmentEndPause?: number;
    sentenceEndPause?: number;

    customLexiconPaths?: string[];

    plainText?: PlainTextOptions;

    alignment?: AlignmentOptions;

    postProcessing?: {
        normalizeAudio?: boolean;
        targetPeak?: number;
        maxGainIncrease?: number;

        speed?: number;
        pitch?: number;
    };

    outputAudioFormat?: {
        codec?: "wav" | "mp3" | "opus" | "m4a" | "ogg" | "flac";
        bitrate?: number;
    };

    languageDetection?: TextLanguageDetectionOptions;

    vits?: {
        speakerId?: number;
        provider?: OnnxExecutionProvider;
    };

    espeak?: {
        rate?: number;
        pitch?: number;
        pitchRange?: number;

        useKlatt?: boolean;
        insertSeparators?: boolean;
    };
}

async function synthesizeSegment(text: string, options: SynthesisOptions) {
    const logger = new Logger();

    const startTimestamp = logger.getTimestamp();

    logger.start("Prepare text for synthesis");

    const simplifiedText = simplifyPunctuationCharacters(text);

    const engine = options.engine;

    logger.start(`Get voice list for ${engine}`);

    const { bestMatchingVoice } = await requestVoiceList(options);

    if (!bestMatchingVoice) {
        throw new Error("No matching voice found 2");
    }

    const selectedVoice = bestMatchingVoice;

    let voicePackagePath: string | undefined;

    if (selectedVoice.packageName) {
        logger.end();

        voicePackagePath = await loadPackage(selectedVoice.packageName);
    }

    logger.start(`Initialize ${engine} module`);

    const voice = selectedVoice.name;

    let language: string;

    if (options.language) {
        language = await normalizeIdentifierToLanguageCode(options.language);
    } else {
        language = selectedVoice.languages[0];
    }

    const voiceGender = selectedVoice.gender;

    const speed = clip(options.speed!, 0.1, 10.0);
    const pitch = clip(options.pitch!, 0.1, 10.0);

    const inputIsSSML = options.ssml!;

    let synthesizedAudio: RawAudio;

    let timeline: Timeline | undefined;

    const shouldPostprocessSpeed = false;
    let shouldPostprocessPitch = false;

    switch (engine) {
        case "vits": {
            if (inputIsSSML) {
                throw new Error(
                    `The VITS engine doesn't currently support SSML inputs`
                );
            }

            let vitsLanguage = language;

            if (vitsLanguage == "en") {
                vitsLanguage = "en-us";
            }

            const lengthScale = 1 / speed;

            const vitsOptions = options.vits!;

            const speakerId = vitsOptions.speakerId;

            if (speakerId != undefined) {
                if (selectedVoice.speakerCount == undefined) {
                    if (speakerId != 0) {
                        throw new Error(
                            "Selected VITS model has only one speaker. Speaker ID must be 0 if specified."
                        );
                    }
                } else if (
                    speakerId < 0 ||
                    speakerId >= selectedVoice.speakerCount
                ) {
                    throw new Error(
                        `Selected VITS model has ${selectedVoice.speakerCount} speaker IDs. Speaker ID should be in the range ${0} to ${selectedVoice.speakerCount - 1}`
                    );
                }
            }

            const lexicons = await loadLexiconsForLanguage(
                language,
                options.customLexiconPaths
            );

            const modelPath = voicePackagePath!;

            const onnxExecutionProviders: OnnxExecutionProvider[] =
                vitsOptions.provider ? [vitsOptions.provider] : [];

            logger.end();

            const { rawAudio, timeline: outTimeline } =
                await VitsTTS.synthesizeSentence(
                    text,
                    voice,
                    modelPath,
                    lengthScale,
                    speakerId ?? 0,
                    lexicons,
                    onnxExecutionProviders
                );

            synthesizedAudio = rawAudio;
            timeline = outTimeline;

            shouldPostprocessPitch = true;

            logger.end();

            break;
        }

        case "espeak": {
            const engineOptions = options.espeak!;

            const espeakVoice = voice;
            const espeakLanguage = selectedVoice.languages[0];
            const espeakRate = engineOptions.rate || speed * 150;
            const espeakPitch = engineOptions.pitch || options.pitch! * 50;
            const espeakPitchRange =
                engineOptions.pitchRange || options.pitchVariation! * 50;
            const espeakUseKlatt = engineOptions.useKlatt || false;
            const espeakInsertSeparators =
                engineOptions.insertSeparators || false;

            const espeakOptions: EspeakOptions = {
                voice: espeakVoice,
                ssml: inputIsSSML,
                rate: espeakRate,
                pitch: espeakPitch,
                pitchRange: espeakPitchRange,
                useKlatt: espeakUseKlatt,
                insertSeparators: espeakInsertSeparators,
            };

            if (inputIsSSML) {
                logger.end();

                const { rawAudio } = await espeakSynthesize(
                    text,
                    espeakOptions
                );

                synthesizedAudio = rawAudio;
            } else {
                const lexicons = await loadLexiconsForLanguage(
                    language,
                    options.customLexiconPaths
                );

                logger.end();

                const { referenceSynthesizedAudio, referenceTimeline } =
                    await preprocessAndSynthesize(
                        text,
                        espeakLanguage,
                        espeakOptions,
                        lexicons
                    );

                synthesizedAudio = referenceSynthesizedAudio;
                timeline = referenceTimeline.flatMap(
                    (clause) => clause.timeline!
                );
            }

            break;
        }

        default: {
            throw new Error(`Engine '${options.engine}' is not supported`);
        }
    }

    logger.start("Postprocess synthesized audio");
    synthesizedAudio = downmixToMono(synthesizedAudio);

    if (options.postProcessing!.normalizeAudio) {
        synthesizedAudio = normalizeAudioLevel(
            synthesizedAudio,
            options.postProcessing!.targetPeak!,
            options.postProcessing!.maxGainIncrease!
        );
    } else {
        synthesizedAudio = attenuateIfClipping(synthesizedAudio);
    }

    const preTrimSampleCount = synthesizedAudio.audioChannels[0].length;
    synthesizedAudio.audioChannels[0] = trimAudioStart(
        synthesizedAudio.audioChannels[0]
    );

    if (timeline) {
        const oldDuration = preTrimSampleCount / synthesizedAudio.sampleRate;
        const newDuration =
            synthesizedAudio.audioChannels[0].length /
            synthesizedAudio.sampleRate;

        timeline = addTimeOffsetToTimeline(timeline, newDuration - oldDuration);
    }

    if (!timeline) {
        logger.start("Align synthesized audio with text");

        let plainText = text;

        if (inputIsSSML) {
            plainText = await convertHtmlToText(text);
        }

        const alignmentOptions = options.alignment!;

        alignmentOptions.language = language;

        if (!alignmentOptions.customLexiconPaths) {
            alignmentOptions.customLexiconPaths = options.customLexiconPaths;
        }

        if (alignmentOptions.dtw!.windowDuration == null) {
            alignmentOptions.dtw!.windowDuration = Math.max(
                5,
                Math.ceil(0.2 * getRawAudioDuration(synthesizedAudio))
            );
        }

        const { wordTimeline } = await align(
            synthesizedAudio,
            plainText,
            alignmentOptions
        );

        timeline = wordTimeline;

        logger.end();
    }

    const postProcessingOptions = options.postProcessing!;

    let timeStretchFactor = postProcessingOptions.speed;

    if (shouldPostprocessSpeed && timeStretchFactor == undefined) {
        timeStretchFactor = speed;
    }

    let pitchShiftFactor = postProcessingOptions.pitch;

    if (shouldPostprocessPitch && pitchShiftFactor == undefined) {
        pitchShiftFactor = pitch;
    }

    if (timeline) {
        timeline = timeline.filter((entry) => isWordOrSymbolWord(entry.text));
    }

    logger.end();

    return { synthesizedAudio, timeline };
}

interface PlainTextOptions {
    paragraphBreaks?: ParagraphBreakType;
    whitespace?: WhitespaceProcessing;
}

type AudioSourceParam = string | Buffer | Uint8Array | RawAudio;

type PhoneAlignmentMethod = "interpolation" | "dtw";

interface AlignmentOptions {
    language?: string;

    crop?: boolean;

    customLexiconPaths?: string[];

    languageDetection?: TextLanguageDetectionOptions;

    plainText?: PlainTextOptions;

    dtw?: {
        granularity?: DtwGranularity | DtwGranularity[];
        windowDuration?: number | number[];
        phoneAlignmentMethod?: PhoneAlignmentMethod;
    };
}

interface AlignmentResult {
    timeline: Timeline;
    wordTimeline: Timeline;

    transcript: string;
    language: string;

    inputRawAudio: RawAudio;
    isolatedRawAudio?: RawAudio;
    backgroundRawAudio?: RawAudio;
}

const defaultAlignmentOptions: AlignmentOptions = {
    language: undefined,

    crop: true,

    customLexiconPaths: undefined,

    languageDetection: {},

    plainText: {
        paragraphBreaks: "double",
        whitespace: "collapse",
    },

    dtw: {
        granularity: undefined,
        windowDuration: undefined,
        phoneAlignmentMethod: "dtw",
    },
};

async function ensureRawAudio(
    input: AudioSourceParam,
    outSampleRate?: number,
    outChannelCount?: number
) {
    let inputAsRawAudio: RawAudio = input as RawAudio;

    if (
        inputAsRawAudio.audioChannels?.length > 0 &&
        inputAsRawAudio.sampleRate
    ) {
        const inputAudioChannelCount = inputAsRawAudio.audioChannels.length;

        if (outChannelCount == 1 && inputAudioChannelCount > 1) {
            inputAsRawAudio = downmixToMono(inputAsRawAudio);
        }

        if (outChannelCount == 2 && inputAudioChannelCount == 1) {
            inputAsRawAudio = cloneRawAudio(inputAsRawAudio);
            inputAsRawAudio.audioChannels.push(
                inputAsRawAudio.audioChannels[0].slice()
            );
        }

        if (
            outChannelCount != null &&
            outChannelCount > 2 &&
            outChannelCount != inputAudioChannelCount
        ) {
            throw new Error(
                `Can't convert ${inputAudioChannelCount} channels to ${outChannelCount} channels. Channel conversion of raw audio currently only supports mono and stereo inputs.`
            );
        }

        if (outSampleRate && inputAsRawAudio.sampleRate != outSampleRate) {
            inputAsRawAudio = await resampleAudioSpeex(
                inputAsRawAudio,
                outSampleRate
            );
        }
    } else if (typeof input == "string" || input instanceof Uint8Array) {
        if (input instanceof Uint8Array && !Buffer.isBuffer(input)) {
            input = Buffer.from(input);
        }

        const inputAsStringOrBuffer = input as string | Buffer;

        inputAsRawAudio = await decodeToChannels(
            inputAsStringOrBuffer,
            outSampleRate,
            outChannelCount
        );
    } else {
        throw new Error("Received an invalid input audio data type.");
    }

    return inputAsRawAudio;
}

type FFMpegOutputOptions = {
    filename?: string;
    codec?: string;
    format?: string;
    sampleRate?: number;
    sampleFormat?: "u8" | "s16" | "s32" | "s64" | "flt" | "dbl";
    channelCount?: number;
    bitrate?: number;
    audioOnly?: boolean;
    customOptions?: string[];
};

function buildCommandLineArguments(
    inputFilename: string,
    outputOptions: FFMpegOutputOptions
) {
    outputOptions = { ...outputOptions };

    if (!outputOptions.filename) {
        outputOptions.filename = "-";
    }

    const args: string[] = [];

    args.push(`-i`, `${inputFilename}`);

    if (outputOptions.audioOnly) {
        args.push(`-map`, `a`);
    }

    if (outputOptions.codec) {
        args.push(`-c:a`, `${outputOptions.codec}`);
    }

    if (outputOptions.format) {
        args.push(`-f:a`, `${outputOptions.format}`);
    }

    if (outputOptions.sampleRate) {
        args.push(`-ar`, `${outputOptions.sampleRate}`);
    }

    if (outputOptions.sampleFormat) {
        args.push(`-sample_fmt`, `${outputOptions.sampleFormat}`);
    }

    if (outputOptions.channelCount) {
        args.push(`-ac`, `${outputOptions.channelCount}`);
    }

    if (outputOptions.bitrate) {
        args.push(`-ab`, `${outputOptions.bitrate}k`);
    }

    args.push(`-y`);

    if (outputOptions.customOptions) {
        args.push(...outputOptions.customOptions);
    }

    args.push(outputOptions.filename);

    return args;
}

async function transcode_CLI(
    ffmpegCommand: string,
    input: string | Buffer,
    outputOptions: FFMpegOutputOptions
) {
    return new Promise<Buffer>((resolve, reject) => {
        const logger = new Logger();
        logger.start("Transcode with command-line ffmpeg");

        const args = buildCommandLineArguments(
            Buffer.isBuffer(input) ? "-" : input,
            outputOptions
        );

        const process = spawn(ffmpegCommand, args);

        if (Buffer.isBuffer(input)) {
            process.stdin.end(input);
        } else if (typeof input === "string") {
            if (!existsSync(input)) {
                reject(`Audio file was not found: ${input}`);
                return;
            }
        }

        const stdoutChunks: Buffer[] = [];
        let stderrOutput = "";

        process.stdout.on("data", (data) => {
            stdoutChunks.push(data);
        });

        process.stderr.setEncoding("utf8");
        process.stderr.on("data", (data) => {
            //log(data)
            stderrOutput += data;
        });

        process.on("error", (e) => {
            reject(e);
        });

        process.on("close", (exitCode) => {
            if (exitCode == 0) {
                const concatenatedChunks = Buffer.concat(stdoutChunks);

                resolve(concatenatedChunks);
            } else {
                reject(`ffmpeg exited with code ${exitCode}`);
                console.log(stderrOutput);
            }

            logger.end();
        });
    });
}

function resolveToVersionedPackageNameIfNeeded(packageName: string) {
    const versionTag = getVersionTagFromPackageName(packageName);

    if (versionTag) {
        return packageName;
    }

    const resolvedVersionTag =
        resolveVersionTagForUnversionedPackageName(packageName);

    return (packageName = `${packageName}-${resolvedVersionTag}`);
}

function resolveVersionTagForUnversionedPackageName(
    unversionedPackageName: string
) {
    return (
        packageVersionTagResolutionLookup[unversionedPackageName] ||
        defaultVersionTag
    );
}

const defaultVersionTag = "20230718";

const packageVersionTagResolutionLookup: { [packageName: string]: string } = {
    "sox-14.4.2-linux-minimal": "20230802",

    "vits-de_DE-thorsten_emotional-medium": "20230808",
    "vits-en_GB-semaine-medium": "20230808",
    "vits-fr_FR-upmc-medium": "20230808",
    "vits-lb_LU-marylux-medium": "20230808",
    "vits-ro_RO-mihai-medium": "20230808",
    "vits-sr_RS-serbski_institut-medium": "20230808",
    "vits-tr_TR-dfki-medium": "20230808",

    "vits-cs_CZ-jirka-medium": "20230824",
    "vits-de_DE-thorsten-high": "20230824",
    "vits-hu_HU-anna-medium": "20230824",
    "vits-pt_PT-tugao-medium": "20230824",
    "vits-sk_SK-lili-medium": "20230824",
    "vits-tr_TR-fahrettin-medium": "20230824",

    "vits-ar_JO-kareem-medium": "20231022",
    "vits-cs_CZ-jirka-low": "20231022",
    "vits-en_US-hfc_male-medium": "20231022",
    "vits-en_US-libritts_r-medium": "20231022",
    "vits-hu_HU-imre-medium": "20231022",
    "vits-pl_PL-mc_speech-medium": "20231022",

    "whisper-tiny": "20231126",
    "whisper-tiny.en": "20231126",
    "whisper-base": "20231126",
    "whisper-base.en": "20231126",
    "whisper-small": "20231126",
    "whisper-small.en": "20231126",
    "whisper-medium": "20231126",
    "whisper-medium.en": "20231126",
    "whisper-large-v3": "20231126",

    "vits-ar_JO-kareem-low": "20231126",
    "vits-en_US-hfc_female-medium": "20231126",

    "ffmpeg-6.0-win32-x64": "20240316",
    "ffmpeg-6.0-win32-ia32": "20240316",
    "ffmpeg-6.0-darwin-x64": "20240316",
    "ffmpeg-6.0-darwin-arm64": "20240316",
    "ffmpeg-6.0-linux-x64": "20240316",
    "ffmpeg-6.0-linux-ia32": "20240316",
    "ffmpeg-6.0-linux-arm64": "20240316",
    "ffmpeg-6.0-linux-arm": "20240316",
    "ffmpeg-6.0-freebsd-x64": "20240316",

    "vits-de_DE-mls-medium": "20240316",
    "vits-en_GB-cori-high": "20240316",
    "vits-en_US-kristin-medium": "20240316",
    "vits-en_US-ljspeech-high": "20240316",
    "vits-en_US-ljspeech-medium": "20240316",
    "vits-es_MX-claude-high": "20240316",
    "vits-fa_IR-amir-medium": "20240316",
    "vits-fa_IR-gyro-medium": "20240316",
    "vits-fr_FR-mls-medium": "20240316",
    "vits-fr_FR-tom-medium": "20240316",
    "vits-nl_NL-mls-medium": "20240316",
    "vits-sl_SI-artur-medium": "20240316",
    "vits-tr_TR-fettah-medium": "20240316",

    "mdxnet-UVR_MDXNET_1_9703": "20240330",
    "mdxnet-UVR_MDXNET_2_9682": "20240330",
    "mdxnet-UVR_MDXNET_3_9662": "20240330",
    "mdxnet-UVR_MDXNET_KARA": "20240330",

    "whisper.cpp-tiny": "20240405",
    "whisper.cpp-tiny-q5_1": "20240405",
    "whisper.cpp-tiny.en": "20240405",
    "whisper.cpp-tiny.en-q5_1": "20240405",
    "whisper.cpp-tiny.en-q8_0": "20240405",

    "whisper.cpp-base": "20240405",
    "whisper.cpp-base-q5_1": "20240405",
    "whisper.cpp-base.en": "20240405",
    "whisper.cpp-base.en-q5_1": "20240405",

    "whisper.cpp-small": "20240405",
    "whisper.cpp-small-q5_1": "20240405",
    "whisper.cpp-small.en": "20240405",
    "whisper.cpp-small.en-q5_1": "20240405",

    "whisper.cpp-medium": "20240405",
    "whisper.cpp-medium-q5_0": "20240405",
    "whisper.cpp-medium.en": "20240405",
    "whisper.cpp-medium.en-q5_0": "20240405",

    "whisper.cpp-large-v1": "20240405",
    "whisper.cpp-large-v2": "20240405",
    "whisper.cpp-large-v2-q5_0": "20240405",
    "whisper.cpp-large-v3": "20240405",
    "whisper.cpp-large-v3-q5_0": "20240405",

    "whisper.cpp-binaries-linux-x64-cpu-latest-patched": "20240405",
    "whisper.cpp-binaries-windows-x64-cpu-latest-patched": "20240409",

    "whisper-tiktoken-data": "20240408",

    "whisper.cpp-binaries-windows-x64-cublas-12.4.0-latest-patched": "20240409",
    "whisper.cpp-binaries-windows-x64-cublas-11.8.0-latest-patched": "20240409",

    "xenova-multilingual-e5-small-q8": "20240504",
    "xenova-nllb-200-distilled-600M-q8": "20240505",
    "xenova-multilingual-e5-small-fp16": "20240514",
    "xenova-multilingual-e5-base-fp16": "20240514",
    "xenova-multilingual-e5-base-q8": "20240514",
    "xenova-multilingual-e5-large-q8": "20240514",

    "w2v-bert-2.0-int8": "20240517",
    "w2v-bert-2.0-uint8": "20240517",
};

function getVersionTagFromPackageName(packageName: string) {
    return packageName.match(
        /.*\-([0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9](_[0-9]+)?)$/
    )?.[1];
}

async function ensureAndGetPackagesDir() {
    const dataPath = getAppDataDir("eliza");

    const packagesPath = path.join(dataPath, "packages");

    await ensureDir(packagesPath);

    return packagesPath;
}

async function downloadFile(
    options: GaxiosOptions,
    targetFilePath: string,
    prompt = "Downloading"
) {
    const write = logLevelGreaterOrEqualTo("info") ? writeToStderr : () => {};

    const downloadPromise = new OpenPromise<void>();

    const timer = new Timer();

    options.responseType = "stream";

    const response = await request<any>(options);

    const ttyOutput = process.stderr.isTTY === true;

    write(`\n${prompt}.. `);

    const rateAveragingWindowSeconds = 5.0;

    let downloadStarted = false;
    let downloadedBytes = 0;
    let totalBytes: number | undefined = undefined;

    const statusUpdateInterval = 250;

    let lastString = prompt;

    const downloadStateHistory: { time: number; downloadedMBytes: number }[] =
        [];

    function updateStatus() {
        if (!downloadStarted) {
            return;
        }

        const totalMBytes = (totalBytes || 0) / 1000 / 1000;
        const downloadedMBytes = downloadedBytes / 1000 / 1000;

        const elapsedTime = timer.elapsedTimeSeconds;
        const cumulativeDownloadRate = downloadedMBytes / elapsedTime;

        const windowStartRecord = downloadStateHistory.find(
            (r) =>
                r.time >= timer.elapsedTimeSeconds - rateAveragingWindowSeconds
        );

        let windowDownloadRate: number;

        if (windowStartRecord) {
            windowDownloadRate =
                (downloadedMBytes - windowStartRecord.downloadedMBytes) /
                (elapsedTime - windowStartRecord.time);
        } else {
            windowDownloadRate = cumulativeDownloadRate;
        }

        downloadStateHistory.push({ time: elapsedTime, downloadedMBytes });

        const isLastUpdate = downloadedMBytes == totalMBytes;

        const downloadedMbytesStr = downloadedMBytes.toFixed(2);
        const totalMbytesStr = totalMBytes.toFixed(2);
        const downloadRateStr = windowDownloadRate.toFixed(2);
        const cumulativeDownloadRateStr = cumulativeDownloadRate.toFixed(2);

        if (ttyOutput) {
            let newString: string;

            if (totalBytes != undefined) {
                const percentage = (downloadedMBytes / totalMBytes) * 100;

                newString = `${prompt}.. ${downloadedMbytesStr}MB/${totalMbytesStr}MB (${percentage.toFixed(1) + "%"}, ${timer.elapsedTimeSeconds.toFixed(1)}s, ${downloadRateStr}MB/s)`;
            } else {
                newString = `${prompt}.. ${downloadedMbytesStr}MB (${timer.elapsedTimeSeconds.toFixed(1)}s, ${downloadRateStr}MB/s)`;
            }

            if (newString != lastString) {
                write("\r");
                write(newString);
            }

            lastString = newString;
        } else {
            if (totalBytes == undefined) {
                return;
            }

            const percent = downloadedBytes / totalBytes;
            const percentDisplay = `${(Math.floor(percent * 10) * 10).toString()}%`;

            if (lastString == prompt) {
                write(`(${totalMbytesStr}MB): `);
            }

            if (percentDisplay != lastString) {
                write(percentDisplay);

                if (percent == 1.0) {
                    write(
                        ` (${timer.elapsedTimeSeconds.toFixed(2)}s, ${cumulativeDownloadRateStr}MB/s)`
                    );
                } else {
                    write(` `);
                }

                lastString = percentDisplay;
            }
        }
    }

    const partialFilePath = `${targetFilePath}.${getRandomHexString(16)}.partial`;
    const fileWriteStream = createWriteStream(partialFilePath, {
        encoding: "binary",
        autoClose: true,
    });

    const statusInterval = setInterval(() => {
        updateStatus();
    }, statusUpdateInterval);

    response.data.on("data", (chunk: Uint8Array) => {
        try {
            const contentLengthString = response.headers["content-length"];

            totalBytes =
                contentLengthString != undefined
                    ? parseInt(contentLengthString)
                    : undefined;

            const chunkLength = chunk.length;

            fileWriteStream.write(chunk);

            downloadedBytes += chunkLength;

            if (downloadStarted == false) {
                downloadStarted = true;
            }
        } catch (err) {
            clearInterval(statusInterval);

            downloadPromise.reject(err);
        }
    });

    response.data.on("end", async () => {
        try {
            clearInterval(statusInterval);
            updateStatus();

            fileWriteStream.end();

            write("\n");

            await move(partialFilePath, targetFilePath);

            downloadPromise.resolve();
        } catch (err) {
            clearInterval(statusInterval);
            downloadPromise.reject(err);
        }
    });

    response.data.on("error", async (err: any) => {
        try {
            clearInterval(statusInterval);

            fileWriteStream.end();
            await remove(partialFilePath);
        } finally {
            downloadPromise.reject(err);
        }
    });

    return downloadPromise.promise;
}

async function extractTarball(filepath: string, outputDir: string) {
    const { extract } = await import("tar");

    await extract({
        file: filepath,
        cwd: outputDir,
        preserveOwner: false,
        //noChmod: true
    });
}

async function downloadAndExtractTarball(
    options: GaxiosOptions,
    targetDir: string,
    baseTempPath: string,
    displayName = "archive"
) {
    const logger = new Logger();

    const randomID = getRandomHexString(16).toLowerCase();
    const tempTarballPath = path.join(baseTempPath, `/${randomID}.tarball`);
    const tempDirPath = path.join(baseTempPath, `/${randomID}`);
    await ensureDir(tempDirPath);

    logger.end();

    await downloadFile(
        options,
        tempTarballPath,
        `${"Downloading"} ${displayName}`
    );

    logger.end();

    logger.start(`Extracting ${displayName}`);

    await extractTarball(tempTarballPath, tempDirPath);

    await remove(tempTarballPath);

    for (const filename of await readdir(tempDirPath)) {
        const sourceFilePath = path.join(tempDirPath, filename);
        const targetFilePath = path.join(targetDir, filename);

        await move(sourceFilePath, targetFilePath);
    }

    await remove(tempDirPath);

    logger.end();
}

async function loadPackage(packageName: string) {
    packageName = resolveToVersionedPackageNameIfNeeded(packageName);

    const packagesPath = await ensureAndGetPackagesDir();

    const packagePath = path.join(packagesPath, packageName);

    if (existsSync(packagePath)) {
        return packagePath;
    }

    const packageBaseURL = getGlobalOption("packageBaseURL");

    const tempPath = getAppTempDir("eliza");

    const headers = {};

    const options = {
        url: `${packageBaseURL}${packageName}.tar.gz`,
        headers,
    };

    await downloadAndExtractTarball(
        options,
        packagesPath,
        tempPath,
        packageName
    );

    return packagePath;
}

interface GlobalOptions {
    ffmpegPath?: string;
    soxPath?: string;
    packageBaseURL?: string;
    logLevel?: LogLevel;
}

const globalOptions: GlobalOptions = {
    ffmpegPath: undefined,
    soxPath: undefined,
    packageBaseURL:
        "https://huggingface.co/echogarden/echogarden-packages/resolve/main/",
    logLevel: "info",
};

function listGlobalOptions() {
    return Object.keys(globalOptions);
}

function getGlobalOption<K extends keyof GlobalOptions>(
    key: K
): GlobalOptions[K] {
    if (!listGlobalOptions().includes(key)) {
        throw new Error(`Unknown global option key '${key}'`);
    }

    return globalOptions[key];
}

async function commandExists(command: string) {
    try {
        await commandExists(command);
        return true;
    } catch {
        return false;
    }
}

async function getFFMpegExecutablePath() {
    // If a global option set for the path, use it
    if (getGlobalOption("ffmpegPath")) {
        return getGlobalOption("ffmpegPath");
    }

    // If an 'ffmpeg' command exist in system path, use it
    if (await commandExists("ffmpeg")) {
        return "ffmpeg";
    }

    // Otherwise, download and use an internal ffmpeg package
    const platform = process.platform;
    const arch = process.arch;

    let packageName: string;

    if (platform === "win32" && arch === "x64") {
        packageName = "ffmpeg-6.0-win32-x64";
    } else if (platform === "win32" && arch === "ia32") {
        packageName = "ffmpeg-6.0-win32-ia32";
    } else if (platform === "darwin" && arch === "x64") {
        packageName = "ffmpeg-6.0-darwin-x64";
    } else if (platform === "darwin" && arch === "arm64") {
        packageName = "ffmpeg-6.0-darwin-arm64";
    } else if (platform === "linux" && arch === "x64") {
        packageName = "ffmpeg-6.0-linux-x64";
    } else if (platform === "linux" && arch === "ia32") {
        packageName = "ffmpeg-6.0-linux-ia32";
    } else if (platform === "linux" && arch === "arm64") {
        packageName = "ffmpeg-6.0-linux-arm64";
    } else if (platform === "linux" && arch === "arm") {
        packageName = "ffmpeg-6.0-linux-arm";
    } else if (platform === "freebsd" && arch === "x64") {
        packageName = "ffmpeg-6.0-freebsd-x64";
    } else {
        return undefined;
    }

    const ffmpegPackagePath = await loadPackage(packageName);

    let filename = packageName;

    if (platform === "win32") {
        filename += ".exe";
    }

    return path.join(ffmpegPackagePath, filename);
}

async function transcode(
    input: string | Buffer,
    outputOptions: FFMpegOutputOptions
) {
    const executablePath = await getFFMpegExecutablePath();

    if (!executablePath) {
        throw new Error(
            `The ffmpeg utility wasn't found. Please ensure it is available on the system path.`
        );
    }

    return transcode_CLI(executablePath, input, outputOptions);
}

function decodeWave(
    waveData: Buffer,
    ignoreTruncatedChunks = true,
    ignoreOverflowingDataChunks = true
) {
    let readOffset = 0;

    const riffId = waveData
        .subarray(readOffset, readOffset + 4)
        .toString("ascii");

    if (riffId != "RIFF") {
        throw new Error("Not a valid wave file. No RIFF id found at offset 0.");
    }

    readOffset += 4;

    let riffChunkSize = waveData.readUInt32LE(readOffset);

    readOffset += 4;

    const waveId = waveData
        .subarray(readOffset, readOffset + 4)
        .toString("ascii");

    if (waveId != "WAVE") {
        throw new Error("Not a valid wave file. No WAVE id found at offset 8.");
    }

    if (ignoreOverflowingDataChunks && riffChunkSize === 4294967295) {
        riffChunkSize = waveData.length - 8;
    }

    if (riffChunkSize < waveData.length - 8) {
        throw new Error(
            `RIFF chunk length ${riffChunkSize} is smaller than the remaining size of the buffer (${waveData.length - 8})`
        );
    }

    if (!ignoreTruncatedChunks && riffChunkSize > waveData.length - 8) {
        throw new Error(
            `RIFF chunk length (${riffChunkSize}) is greater than the remaining size of the buffer (${waveData.length - 8})`
        );
    }

    readOffset += 4;

    let formatSubChunkBodyBuffer: Buffer | undefined;
    const dataBuffers: Buffer[] = [];

    while (true) {
        const subChunkIdentifier = waveData
            .subarray(readOffset, readOffset + 4)
            .toString("ascii");
        readOffset += 4;

        let subChunkSize = waveData.readUInt32LE(readOffset);
        readOffset += 4;

        if (
            !ignoreTruncatedChunks &&
            subChunkSize > waveData.length - readOffset
        ) {
            throw new Error(
                `Encountered a '${subChunkIdentifier}' subchunk with a size of ${subChunkSize} which is greater than the remaining size of the buffer (${waveData.length - readOffset})`
            );
        }

        if (subChunkIdentifier == "fmt ") {
            formatSubChunkBodyBuffer = waveData.subarray(
                readOffset,
                readOffset + subChunkSize
            );
        } else if (subChunkIdentifier == "data") {
            if (!formatSubChunkBodyBuffer) {
                throw new Error(
                    "A data subchunk was encountered before a format subchunk"
                );
            }

            // If the data chunk is truncated or extended beyond 4 GiB,
            // the data would be read up to the end of the buffer
            if (ignoreOverflowingDataChunks && subChunkSize === 4294967295) {
                subChunkSize = waveData.length - readOffset;
            }

            const subChunkData = waveData.subarray(
                readOffset,
                readOffset + subChunkSize
            );

            dataBuffers.push(subChunkData);
        }
        // All sub chunks other than 'data' (e.g. 'LIST', 'fact', 'plst', 'junk' etc.) are ignored

        // This addition operation may overflow if JavaScript integers were 32 bits,
        // but since they are 52 bits, it is okay:
        readOffset += subChunkSize;

        // Break if readOffset is equal to or is greater than the size of the buffer
        if (readOffset >= waveData.length) {
            break;
        }
    }

    if (!formatSubChunkBodyBuffer) {
        throw new Error("No format subchunk was found in the wave file");
    }

    if (dataBuffers.length === 0) {
        throw new Error("No data subchunks were found in the wave file");
    }

    const waveFormat = WaveFormat.deserializeFrom(formatSubChunkBodyBuffer);

    const sampleFormat = waveFormat.sampleFormat;
    const channelCount = waveFormat.channelCount;
    const sampleRate = waveFormat.sampleRate;
    const bitDepth = waveFormat.bitDepth;
    const speakerPositionMask = waveFormat.speakerPositionMask;

    const concatenatedDataBuffers = Buffer.concat(dataBuffers);
    dataBuffers.length = 0; // Allow the garbage collector to free up memory held by the data buffers

    const audioChannels = decodeAudioBufferToChannels(
        concatenatedDataBuffers,
        channelCount,
        bitDepth,
        sampleFormat
    );

    return {
        rawAudio: { audioChannels, sampleRate },

        sourceSampleFormat: sampleFormat,
        sourceBitDepth: bitDepth,
        sourceSpeakerPositionMask: speakerPositionMask,
    };
}

// Int8 PCM <-> Float32 conversion
function int8PcmToFloat32(input: Int8Array) {
    const output = new Float32Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = input[i];
        output[i] = sample < 0 ? sample / 128 : sample / 127;
    }

    return output;
}

// Int24 PCM <-> Float32 conversion (uses int32 for storage)
function int24PcmToFloat32(input: Int32Array) {
    const output = new Float32Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = input[i];
        output[i] = sample < 0 ? sample / 8388608 : sample / 8388607;
    }

    return output;
}

function int32PcmToFloat32(input: Int32Array) {
    const output = new Float32Array(input.length);

    for (let i = 0; i < input.length; i++) {
        const sample = input[i];
        output[i] = sample < 0 ? sample / 2147483648 : sample / 2147483647;
    }

    return output;
}

function decodeAudioBufferToChannels(
    audioBuffer: Buffer,
    channelCount: number,
    sourceBitDepth: number,
    sourceSampleFormat: SampleFormat
) {
    let interleavedChannels: Float32Array;

    if (sourceSampleFormat === SampleFormat.PCM) {
        if (sourceBitDepth === 8) {
            interleavedChannels = int8PcmToFloat32(bufferToInt8(audioBuffer));
        } else if (sourceBitDepth === 16) {
            interleavedChannels = int16PcmToFloat32(
                bufferLEToInt16(audioBuffer)
            );
        } else if (sourceBitDepth === 24) {
            interleavedChannels = int24PcmToFloat32(
                bufferLEToInt24(audioBuffer)
            );
        } else if (sourceBitDepth === 32) {
            interleavedChannels = int32PcmToFloat32(
                bufferLEToInt32(audioBuffer)
            );
        } else {
            throw new Error(`Unsupported PCM bit depth: ${sourceBitDepth}`);
        }
    } else if (sourceSampleFormat === SampleFormat.Float) {
        if (sourceBitDepth === 32) {
            interleavedChannels = bufferLEToFloat32(audioBuffer);
        } else if (sourceBitDepth === 64) {
            interleavedChannels = float64Tofloat32(
                bufferLEToFloat64(audioBuffer)
            );
        } else {
            throw new Error(`Unsupported float bit depth: ${sourceBitDepth}`);
        }
    } else if (sourceSampleFormat === SampleFormat.Alaw) {
        if (sourceBitDepth === 8) {
            interleavedChannels = int16PcmToFloat32(
                AlawMulaw.alaw.decode(audioBuffer)
            );
        } else {
            throw new Error(`Unsupported alaw bit depth: ${sourceBitDepth}`);
        }
    } else if (sourceSampleFormat === SampleFormat.Mulaw) {
        if (sourceBitDepth === 8) {
            interleavedChannels = int16PcmToFloat32(
                AlawMulaw.mulaw.decode(audioBuffer)
            );
        } else {
            throw new Error(`Unsupported mulaw bit depth: ${sourceBitDepth}`);
        }
    } else {
        throw new Error(`Unsupported audio format: ${sourceSampleFormat}`);
    }

    audioBuffer = Buffer.from([]); // Zero the buffer reference to allow the GC to free up memory, if possible

    return deInterleaveChannels(interleavedChannels, channelCount);
}

function deInterleaveChannels(
    interleavedChannels: Float32Array,
    channelCount: number
) {
    if (channelCount === 0) {
        throw new Error("0 channel count received");
    }

    if (channelCount === 1) {
        return [interleavedChannels];
    }

    if (interleavedChannels.length % channelCount != 0) {
        throw new Error(
            `Size of interleaved channels (${interleaveChannels.length}) is not a multiple of channel count (${channelCount})`
        );
    }

    const sampleCount = interleavedChannels.length / channelCount;
    const channels: Float32Array[] = [];

    for (let i = 0; i < channelCount; i++) {
        channels.push(new Float32Array(sampleCount));
    }

    let readIndex = 0;

    for (let i = 0; i < sampleCount; i++) {
        for (let c = 0; c < channelCount; c++) {
            channels[c][i] = interleavedChannels[readIndex];
            readIndex += 1;
        }
    }

    return channels;
}

function decodeWaveToRawAudio(
    waveFileBuffer: Buffer,
    ignoreTruncatedChunks = true,
    ignoreOverflowingDataChunks = true
) {
    return decodeWave(
        waveFileBuffer,
        ignoreTruncatedChunks,
        ignoreOverflowingDataChunks
    );
}

async function decodeToChannels(
    input: string | Buffer,
    outSampleRate?: number,
    outChannelCount?: number
) {
    const outputOptions: FFMpegOutputOptions = {
        codec: "pcm_f32le",
        format: "wav",
        sampleRate: outSampleRate,
        channelCount: outChannelCount,
        audioOnly: true,
    };

    const waveAudio = await transcode(input, outputOptions);

    const logger = new Logger();

    logger.start(`Convert wave buffer to raw audio`);
    const { rawAudio } = decodeWaveToRawAudio(waveAudio);
    logger.end();

    return rawAudio;
}

async function align(
    input: AudioSourceParam,
    transcript: string,
    options: AlignmentOptions
): Promise<AlignmentResult> {
    const logger = new Logger();

    const startTimestamp = logger.getTimestamp();

    options = extendDeep(defaultAlignmentOptions, options);

    const inputRawAudio = await ensureRawAudio(input);

    let sourceRawAudio: RawAudio;
    let isolatedRawAudio: RawAudio | undefined;
    let backgroundRawAudio: RawAudio | undefined;

    logger.start(`Resample audio to 16kHz mono`);
    sourceRawAudio = await ensureRawAudio(inputRawAudio, 16000, 1);

    let sourceUncropTimeline: Timeline | undefined;

    logger.start("Normalize and trim audio");

    sourceRawAudio = normalizeAudioLevel(sourceRawAudio);
    sourceRawAudio.audioChannels[0] = trimAudioEnd(
        sourceRawAudio.audioChannels[0]
    );

    logger.end();

    let language: string;

    if (options.language) {
        const languageData = await parseLangIdentifier(options.language);

        language = languageData.Name;

        logger.logTitledMessage(
            "Language specified",
            formatLanguageCodeWithName(language)
        );
    } else {
        logger.start(
            "No language specified. Detect language using reference text"
        );
        const { detectedLanguage } = await detectTextLanguage(
            transcript,
            options.languageDetection || {}
        );

        language = detectedLanguage;

        logger.end();

        logger.logTitledMessage(
            "Language detected",
            formatLanguageCodeWithName(language)
        );
    }

    language = getDefaultDialectForLanguageCodeIfPossible(language);

    logger.start("Load alignment module");

    function getDtwWindowGranularitiesAndDurations() {
        const sourceAudioDuration = getRawAudioDuration(sourceRawAudio);

        const granularities: DtwGranularity[] = ["high"];
        let windowDurations: number[];

        if (options.dtw!.windowDuration) {
            if (typeof options.dtw!.windowDuration === "number") {
                windowDurations = [options.dtw!.windowDuration];
            } else if (Array.isArray(options.dtw!.windowDuration)) {
                windowDurations = options.dtw!.windowDuration;
            } else {
                throw new Error(
                    `'dtw.windowDuration' must be a number or an array of numbers.`
                );
            }
        } else {
            if (granularities.length > 2) {
                throw new Error(
                    `More than two passes requested, this requires window durations to be explicitly specified for each pass. For example 'dtw.windowDuration=[600,60,10]'.`
                );
            }

            if (sourceAudioDuration < 5 * 60) {
                // If up to 5 minutes, set window duration to one minute
                windowDurations = [60];
            } else if (sourceAudioDuration < 2.5 * 60 * 60) {
                // If less than 2.5 hours, set window duration to 20% of total duration
                windowDurations = [Math.ceil(sourceAudioDuration * 0.2)];
            } else {
                // Otherwise, set window duration to 30 minutes
                windowDurations = [30 * 60];
            }
        }

        if (granularities.length === 2 && windowDurations.length === 1) {
            windowDurations = [windowDurations[0], 15];
        }

        if (granularities.length != windowDurations.length) {
            throw new Error(
                `The option 'dtw.granularity' has ${granularities.length} values, but 'dtw.windowDuration' has ${windowDurations.length} values. The lengths should be equal.`
            );
        }

        return { windowDurations, granularities };
    }

    let mappedTimeline: Timeline;

    const { windowDurations, granularities } =
        getDtwWindowGranularitiesAndDurations();

    logger.end();

    const { referenceRawAudio, referenceTimeline } =
        await createAlignmentReferenceUsingEspeak(
            transcript,
            language,
            options.plainText,
            options.customLexiconPaths,
            false,
            false
        );

    logger.end();

    mappedTimeline = await alignUsingDtw(
        sourceRawAudio,
        referenceRawAudio,
        referenceTimeline,
        granularities,
        windowDurations
    );

    logger.start(`Postprocess timeline`);

    // If the audio was cropped before recognition, map the timestamps back to the original audio
    if (sourceUncropTimeline && sourceUncropTimeline.length > 0) {
        convertCroppedToUncroppedTimeline(mappedTimeline, sourceUncropTimeline);
    }

    // Add text offsets
    addWordTextOffsetsToTimeline(mappedTimeline, transcript);

    // Make segment timeline
    const { segmentTimeline } = await wordTimelineToSegmentSentenceTimeline(
        mappedTimeline,
        transcript,
        language,
        options.plainText?.paragraphBreaks,
        options.plainText?.whitespace
    );

    logger.end();

    return {
        timeline: segmentTimeline,
        wordTimeline: mappedTimeline,

        transcript,
        language,

        inputRawAudio,
        isolatedRawAudio,
        backgroundRawAudio,
    };
}

function getDefaultDialectForLanguageCodeIfPossible(langCode: string) {
    const defaultDialect = defaultDialectForLanguageCode[langCode];

    return defaultDialect || langCode;
}

async function wordTimelineToSegmentSentenceTimeline(
    wordTimeline: Timeline,
    transcript: string,
    language: string,
    paragraphBreaks: ParagraphBreakType = "double",
    whitespace: WhitespaceProcessing = "collapse"
) {
    const paragraphs = splitToParagraphs(
        transcript,
        paragraphBreaks,
        whitespace
    );

    const segments = paragraphs.map((segment) =>
        splitToSentences(segment, language).map((sentence) => sentence.trim())
    );

    let text = "";
    const charIndexToSentenceEntryMapping: TimelineEntry[] = [];

    const segmentTimeline: Timeline = [];

    for (const segment of segments) {
        const sentencesInSegment: Timeline = [];

        const segmentEntry: TimelineEntry = {
            type: "segment",
            text: "",
            startTime: -1,
            endTime: -1,
            timeline: sentencesInSegment,
        };

        for (const sentence of segment) {
            const sentenceEntry: TimelineEntry = {
                type: "sentence",
                text: sentence,
                startTime: -1,
                endTime: -1,
                timeline: [],
            };

            for (const char of sentence + " ") {
                text += char;
                charIndexToSentenceEntryMapping.push(sentenceEntry);
            }

            sentencesInSegment.push(sentenceEntry);
        }

        segmentTimeline.push(segmentEntry);
    }

    let wordSearchStartOffset = 0;

    for (let wordIndex = 0; wordIndex < wordTimeline.length; wordIndex++) {
        const wordEntry = wordTimeline[wordIndex];
        const wordText = wordEntry.text;

        if (!isWordOrSymbolWord(wordText)) {
            continue;
        }

        const indexOfWordInText = text.indexOf(wordText, wordSearchStartOffset);

        if (indexOfWordInText == -1) {
            throw new Error(
                `Couldn't find the word '${wordText}' in the text at start position ${wordSearchStartOffset}`
            );
        }

        const targetSentenceEntry =
            charIndexToSentenceEntryMapping[indexOfWordInText];
        targetSentenceEntry.timeline!.push(deepClone(wordEntry));

        wordSearchStartOffset = indexOfWordInText + wordText.length;
    }

    const newSegmentTimeline: Timeline = [];

    for (const segmentEntry of segmentTimeline) {
        const oldSentenceTimeline = segmentEntry.timeline!;

        const newSentenceTimeline: Timeline = [];

        for (const sentenceEntry of oldSentenceTimeline) {
            const wordTimeline = sentenceEntry.timeline;

            if (!wordTimeline || wordTimeline.length == 0) {
                continue;
            }

            sentenceEntry.startTime = wordTimeline[0].startTime;
            sentenceEntry.endTime =
                wordTimeline[wordTimeline.length - 1].endTime;

            newSentenceTimeline.push(sentenceEntry);
        }

        if (newSentenceTimeline.length == 0) {
            continue;
        }

        segmentEntry.text = newSentenceTimeline
            .map((sentenceEntry) => sentenceEntry.text)
            .join(" ");

        segmentEntry.startTime = newSentenceTimeline[0].startTime;
        segmentEntry.endTime =
            newSentenceTimeline[newSentenceTimeline.length - 1].endTime;

        newSegmentTimeline.push(segmentEntry);
    }

    return { segmentTimeline: newSegmentTimeline };
}

interface UncropTimelineMapResult {
    mappedStartTime: number;
    mappedEndTime: number;
}

function mapUsingUncropTimeline(
    startTimeInCroppedAudio: number,
    endTimeInCroppedAudio: number,
    uncropTimeline: Timeline
): UncropTimelineMapResult {
    if (uncropTimeline.length === 0) {
        return {
            mappedStartTime: 0,
            mappedEndTime: 0,
        };
    }

    let offsetInCroppedAudio = 0;

    if (endTimeInCroppedAudio < startTimeInCroppedAudio) {
        endTimeInCroppedAudio = startTimeInCroppedAudio;
    }

    let bestOverlapDuration = -1;
    let mappedStartTime = -1;
    let mappedEndTime = -1;

    for (const uncropEntry of uncropTimeline) {
        const uncropEntryDuration = uncropEntry.endTime - uncropEntry.startTime;

        const overlapStartTime = Math.max(
            startTimeInCroppedAudio,
            offsetInCroppedAudio
        );
        const overlapEndTime = Math.min(
            endTimeInCroppedAudio,
            offsetInCroppedAudio + uncropEntryDuration
        );

        const overlapDuration = overlapEndTime - overlapStartTime;

        if (overlapDuration >= 0 && overlapDuration > bestOverlapDuration) {
            bestOverlapDuration = overlapDuration;

            mappedStartTime =
                uncropEntry.startTime +
                (overlapStartTime - offsetInCroppedAudio);
            mappedEndTime =
                uncropEntry.startTime + (overlapEndTime - offsetInCroppedAudio);
        }

        offsetInCroppedAudio += uncropEntryDuration;
    }

    if (bestOverlapDuration === -1) {
        if (startTimeInCroppedAudio >= offsetInCroppedAudio) {
            const maxTimestamp =
                uncropTimeline[uncropTimeline.length - 1].endTime;

            return {
                mappedStartTime: maxTimestamp,
                mappedEndTime: maxTimestamp,
            };
        } else {
            throw new Error(
                `Given start time ${startTimeInCroppedAudio} was smaller than audio duration but no match was found in uncrop timeline (should not occur)`
            );
        }
    }

    return {
        mappedStartTime,
        mappedEndTime,
    };
}

function convertCroppedToUncroppedTimeline(
    timeline: Timeline,
    uncropTimeline: Timeline
) {
    if (timeline.length === 0) {
        return;
    }

    for (const entry of timeline) {
        const { mappedStartTime, mappedEndTime } = mapUsingUncropTimeline(
            entry.startTime,
            entry.endTime,
            uncropTimeline
        );

        const mapSubTimeline = (subTimeline: Timeline | undefined) => {
            if (!subTimeline) {
                return;
            }

            for (const subEntry of subTimeline) {
                subEntry.startTime = Math.min(
                    mappedStartTime + (subEntry.startTime - entry.startTime),
                    mappedEndTime
                );
                subEntry.endTime = Math.min(
                    mappedStartTime + (subEntry.endTime - entry.startTime),
                    mappedEndTime
                );

                mapSubTimeline(subEntry.timeline);
            }
        };

        mapSubTimeline(entry.timeline);

        entry.startTime = mappedStartTime;
        entry.endTime = mappedEndTime;
    }
}

function getUTF32Chars(str: string) {
    const utf32chars: string[] = [];
    const mapping: number[] = [];

    let utf32Index = 0;

    for (const utf32char of str) {
        utf32chars.push(utf32char);

        for (let i = 0; i < utf32char.length; i++) {
            mapping.push(utf32Index);
        }

        utf32Index += 1;
    }

    mapping.push(utf32Index);

    return { utf32chars, mapping };
}

function addWordTextOffsetsToTimeline(
    timeline: Timeline,
    text: string,
    currentOffset = 0
) {
    const { mapping } = getUTF32Chars(text);

    for (const entry of timeline) {
        if (entry.type == "word") {
            let word = entry.text;

            word = word.trim().replaceAll(/\s+/g, " ");

            const wordParts = word.split(" ");

            let startOffset: number | undefined;
            let endOffset: number | undefined;

            for (let i = 0; i < wordParts.length; i++) {
                const wordPart = wordParts[i];

                const wordPartOffset = text.indexOf(wordPart, currentOffset);

                if (wordPartOffset == -1) {
                    continue;
                }

                currentOffset = wordPartOffset + wordParts[i].length;

                if (i == 0) {
                    startOffset = wordPartOffset;
                }

                endOffset = currentOffset;
            }

            entry.startOffsetUtf16 = startOffset;
            entry.endOffsetUtf16 = endOffset;

            entry.startOffsetUtf32 =
                startOffset != undefined ? mapping[startOffset] : undefined;
            entry.endOffsetUtf32 =
                endOffset != undefined ? mapping[endOffset] : undefined;
        } else if (entry.timeline) {
            currentOffset = addWordTextOffsetsToTimeline(
                entry.timeline,
                text,
                currentOffset
            );
        }
    }

    return currentOffset;
}

async function createAlignmentReferenceUsingEspeak(
    transcript: string,
    language: string,
    plaintextOptions?: PlainTextOptions,
    customLexiconPaths?: string[],
    insertSeparators?: boolean,
    useKlatt?: boolean
) {
    const logger = new Logger();

    logger.start("Synthesize alignment reference with eSpeak");

    const synthesisOptions: SynthesisOptions = {
        engine: "espeak",
        language,

        plainText: plaintextOptions,
        customLexiconPaths: customLexiconPaths,
    };

    let {
        audio: referenceRawAudio,
        timeline: segmentTimeline,
        voice: espeakVoice,
    } = await synthesize(transcript, synthesisOptions);

    const sentenceTimeline = segmentTimeline.flatMap(
        (entry) => entry.timeline!
    );
    const wordTimeline = sentenceTimeline.flatMap((entry) => entry.timeline!);

    referenceRawAudio = await resampleAudioSpeex(
        referenceRawAudio as RawAudio,
        16000
    );
    referenceRawAudio = downmixToMonoAndNormalize(referenceRawAudio);

    logger.end();

    return { referenceRawAudio, referenceTimeline: wordTimeline, espeakVoice };
}

function downmixToMonoAndNormalize(
    rawAudio: RawAudio,
    targetPeakDecibels = -3
) {
    return normalizeAudioLevel(downmixToMono(rawAudio), targetPeakDecibels);
}

async function loadLexiconFile(jsonFilePath: string): Promise<Lexicon> {
    const parsedLexicon: Lexicon = await readAndParseJsonFile(jsonFilePath);

    return parsedLexicon;
}

async function loadLexiconsForLanguage(
    language: string,
    customLexiconPaths?: string[]
) {
    const lexicons: Lexicon[] = [];

    if (getShortLanguageCode(language) == "en") {
        const heteronymsLexicon = await loadLexiconFile(
            resolveToModuleRootDir("data/lexicons/heteronyms.en.json")
        );
        lexicons.push(heteronymsLexicon);
    }

    if (customLexiconPaths && customLexiconPaths.length > 0) {
        for (const customLexicon of customLexiconPaths) {
            const customLexiconObject = await loadLexiconFile(customLexicon);

            lexicons.push(customLexiconObject);
        }
    }

    return lexicons;
}

function downmixToMono(rawAudio: RawAudio): RawAudio {
    const channelCount = rawAudio.audioChannels.length;
    const sampleCount = rawAudio.audioChannels[0].length;

    if (channelCount === 1) {
        return cloneRawAudio(rawAudio);
    }

    const downmixedAudio = new Float32Array(sampleCount);

    for (const channelSamples of rawAudio.audioChannels) {
        for (let i = 0; i < sampleCount; i++) {
            downmixedAudio[i] += channelSamples[i];
        }
    }

    if (channelCount > 1) {
        for (let i = 0; i < sampleCount; i++) {
            downmixedAudio[i] /= channelCount;
        }
    }

    return {
        audioChannels: [downmixedAudio],
        sampleRate: rawAudio.sampleRate,
    } as RawAudio;
}

function applyGainFactor(rawAudio: RawAudio, gainFactor: number): RawAudio {
    const outputAudioChannels: Float32Array[] = [];

    for (const channelSamples of rawAudio.audioChannels) {
        const sampleCount = channelSamples.length;

        const outputChannelSamples = new Float32Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {
            outputChannelSamples[i] = channelSamples[i] * gainFactor;
        }

        outputAudioChannels.push(outputChannelSamples);
    }

    return {
        audioChannels: outputAudioChannels,
        sampleRate: rawAudio.sampleRate,
    } as RawAudio;
}

function normalizeAudioLevel(
    rawAudio: RawAudio,
    targetPeakDecibels = -3,
    maxGainIncreaseDecibels = 30
): RawAudio {
    //rawAudio = correctDCBias(rawAudio)

    const targetPeakAmplitude = decibelsToGainFactor(targetPeakDecibels);
    const maxGainFactor = decibelsToGainFactor(maxGainIncreaseDecibels);

    const peakAmplitude = getSamplePeakAmplitude(rawAudio.audioChannels);

    const gainFactor = Math.min(
        targetPeakAmplitude / peakAmplitude,
        maxGainFactor
    );

    return applyGainFactor(rawAudio, gainFactor);
}

function attenuateIfClipping(rawAudio: RawAudio) {
    return normalizeAudioLevel(rawAudio, -0.1, 0);
}

const symbolWords = [
    "$",
    "€",
    "¢",
    "£",
    "¥",
    "©",
    "®",
    "™",
    "%",
    "&",
    "#",
    "~",
    "@",
    "+",
    "±",
    "÷",
    "/",
    "*",
    "=",
    "¼",
    "½",
    "¾",
];

function isWord(str: string) {
    return wordCharacterPattern.test(str.trim());
}

function multiplyTimelineByFactor(targetTimeline: Timeline, factor: number) {
    const newTimeline = deepClone(targetTimeline);

    for (const segmentTimelineEntry of newTimeline) {
        segmentTimelineEntry.startTime =
            segmentTimelineEntry.startTime * factor;
        segmentTimelineEntry.endTime = segmentTimelineEntry.endTime * factor;

        if (segmentTimelineEntry.timeline) {
            segmentTimelineEntry.timeline = multiplyTimelineByFactor(
                segmentTimelineEntry.timeline,
                factor
            );
        }
    }

    return newTimeline;
}

function isWordOrSymbolWord(str: string) {
    return isWord(str) || symbolWords.includes(str);
}

const defaultSynthesisOptions: SynthesisOptions = {
    engine: "vits",
    language: "en-us",

    voice: undefined,
    voiceGender: undefined,

    speed: 1.0,
    pitch: 1.0,
    pitchVariation: 1.0,

    ssml: false,

    splitToSentences: true,

    segmentEndPause: 1.0,
    sentenceEndPause: 0.75,

    customLexiconPaths: undefined,

    plainText: {
        paragraphBreaks: "double",
        whitespace: "collapse",
    },

    alignment: {
        dtw: {
            granularity: "high",
        },
    },

    postProcessing: {
        normalizeAudio: true,
        targetPeak: -3,
        maxGainIncrease: 30,

        speed: undefined,
        pitch: undefined,
    },

    outputAudioFormat: undefined,

    languageDetection: undefined,

    vits: {
        speakerId: undefined,
        provider: undefined,
    },

    espeak: {
        rate: undefined,
        pitch: undefined,
        pitchRange: undefined,
        useKlatt: false,
    },
};

const defaultDialectForLanguageCode: { [lang: string]: string } = {
    en: "en-US",
    zh: "zh-CN",
    ar: "ar-EG",
    fr: "fr-FR",
    de: "de-DE",
    pt: "pt-BR",
    es: "es-ES",
    nl: "nl-NL",
};

function getAppDataDir(appName: string) {
    let dataDir: string;

    const platform = process.platform;
    const homeDir = os.homedir();

    if (platform == "win32") {
        dataDir = path.join(homeDir, "AppData", "Local", appName);
    } else if (platform == "darwin") {
        dataDir = path.join(homeDir, "Library", "Application Support", appName);
    } else if (platform == "linux") {
        dataDir = path.join(homeDir, ".local", "share", appName);
    } else {
        throw new Error(`Unsupport platform ${platform}`);
    }

    return dataDir;
}

const existsSync = gracefulFS.existsSync;

const stat = promisify(gracefulFS.stat);

async function ensureDir(dirPath: string) {
    dirPath = path.normalize(dirPath);

    if (existsSync(dirPath)) {
        const dirStats = await stat(dirPath);

        if (!dirStats.isDirectory()) {
            throw new Error(
                `The path '${dirPath}' exists but is not a directory.`
            );
        }
    } else {
        return fsExtra.ensureDir(dirPath);
    }
}

async function isFileIsUpToDate(filePath: string, timeRangeSeconds: number) {
    const fileUpdateTime = (await stat(filePath)).mtime.valueOf();

    const currentTime = new Date().valueOf();

    const differenceInMilliseconds = currentTime - fileUpdateTime;

    const differenceInSeconds = differenceInMilliseconds / 1000;

    return differenceInSeconds <= timeRangeSeconds;
}

function getAppTempDir(appName: string) {
    let tempDir: string;

    const platform = process.platform;
    const homeDir = os.homedir();

    if (platform == "win32") {
        tempDir = path.join(homeDir, "AppData", "Local", "Temp", appName);
    } else if (platform == "darwin") {
        tempDir = path.join(homeDir, "Library", "Caches", appName);
    } else if (platform == "linux") {
        tempDir = path.join(homeDir, ".cache", appName);
    } else {
        throw new Error(`Unsupport platform ${platform}`);
    }

    return tempDir;
}

async function writeFile(
    filePath: string,
    data: string | NodeJS.ArrayBufferView,
    options?: fsExtra.WriteFileOptions
) {
    return outputFile(filePath, data, options);
}

const access = promisify(gracefulFS.access);

const remove = fsExtra.remove;

async function existsAndIsWritable(targetPath: string) {
    try {
        await access(targetPath, gracefulFS.constants.W_OK);
    } catch {
        return false;
    }

    return true;
}

async function testDirectoryIsWritable(dir: string) {
    const testFileName = path.join(dir, getRandomHexString(16));

    try {
        await fsExtra.createFile(testFileName);
        await remove(testFileName);
    } catch (e) {
        return false;
    }

    return true;
}

async function move(source: string, dest: string) {
    source = path.normalize(source);
    dest = path.normalize(dest);

    if (existsSync(dest)) {
        const destPathExistsAndIsWritable = await existsAndIsWritable(dest);

        if (!destPathExistsAndIsWritable) {
            throw new Error(
                `The destination path '${dest}' exists but is not writable. There may be a permissions or locking issue.`
            );
        }
    } else {
        const destDir = path.parse(dest).dir;
        const destDirIsWritable = await testDirectoryIsWritable(destDir);

        if (!destDirIsWritable) {
            throw new Error(
                `The directory ${destDir} is not writable. There may be a permissions issue.`
            );
        }
    }

    return fsExtra.move(source, dest, { overwrite: true });
}

const outputFile = fsExtra.outputFile;

async function writeFileSafe(
    filePath: string,
    data: string | NodeJS.ArrayBufferView,
    options?: fsExtra.WriteFileOptions
) {
    const tempDir = getAppTempDir("eliza");
    const tempFilePath = path.join(
        tempDir,
        `${getRandomHexString(16)}.partial`
    );

    await writeFile(tempFilePath, data, options);

    await move(tempFilePath, filePath);
}

function getRandomHexString(charCount = 32, upperCase = false) {
    if (charCount % 2 !== 0) {
        throw new Error(`'charCount' must be an even number`);
    }

    let hex = randomBytes(charCount / 2).toString("hex");

    if (upperCase) {
        hex = hex.toUpperCase();
    }

    return hex;
}

function stringifyAndFormatJson(obj: any) {
    return JSON.stringify(obj, undefined, 4);
}

async function normalizeIdentifierToLanguageCode(langIdentifier: string) {
    const result = await parseLangIdentifier(langIdentifier);

    return result.Name;
}

const langInfoEntries: LangInfoEntry[] = [];

interface LangInfoEntry {
    LCID: number;

    Name: string;
    NameLowerCase: string;

    TwoLetterISOLanguageName: string;
    ThreeLetterISOLanguageName: string;
    ThreeLetterWindowsLanguageName: string;

    EnglishName: string;
    EnglishNameLowerCase: string;

    ANSICodePage: string;
}

function getModuleRootDir() {
    const currentScriptDir = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(currentScriptDir, "..", "..");
}

function resolveToModuleRootDir(relativePath: string) {
    return path.resolve(getModuleRootDir(), relativePath);
}

async function loadLangInfoEntriesIfNeeded() {
    if (langInfoEntries.length > 0) {
        return;
    }

    const entries = (await readAndParseJsonFile(
        resolveToModuleRootDir("data/tables/lcid-table.json")
    )) as LangInfoEntry[];

    for (const entry of entries) {
        entry.NameLowerCase = entry.Name.toLowerCase();
        entry.EnglishNameLowerCase = entry.EnglishName.toLowerCase();

        langInfoEntries.push(entry);
    }
}

async function parseLangIdentifier(langIdentifier: string) {
    if (!langIdentifier) {
        return emptyLangInfoEntry;
    }

    await loadLangInfoEntriesIfNeeded();

    langIdentifier = langIdentifier.trim().toLowerCase();

    for (const entry of langInfoEntries) {
        if (
            langIdentifier === entry.NameLowerCase ||
            langIdentifier === entry.ThreeLetterISOLanguageName ||
            langIdentifier === entry.EnglishNameLowerCase
        ) {
            return entry;
        }
    }

    throw new Error(`Couldn't parse language identifier '${langIdentifier}'.`);
}

const emptyLangInfoEntry: LangInfoEntry = {
    LCID: -1,

    Name: "",
    NameLowerCase: "",

    TwoLetterISOLanguageName: "",
    ThreeLetterISOLanguageName: "",
    ThreeLetterWindowsLanguageName: "",

    EnglishName: "Empty",
    EnglishNameLowerCase: "empty",

    ANSICodePage: "",
};

/////////////////////////////////////////////////////////////////////////////////////////////
// Voice list request
/////////////////////////////////////////////////////////////////////////////////////////////
async function requestVoiceList(
    options: VoiceListRequestOptions
): Promise<RequestVoiceListResult> {
    console.log("voice list requests", options);
    options = extendDeep(defaultVoiceListRequestOptions, options);

    const cacheOptions = options.cache!;

    let cacheDir = cacheOptions?.path;

    if (!cacheDir) {
        const appDataDir = getAppDataDir("eliza");
        cacheDir = path.join(appDataDir, "voice-list-cache");
        await ensureDir(cacheDir);
    }

    const cacheFilePath = path.join(cacheDir, `${options.engine}.voices.json`);
    console.log("cacheFilePath", cacheFilePath);
    async function loadVoiceList() {
        let voiceList: SynthesisVoice[] = [];

        switch (options.engine) {
            case "vits": {
                voiceList = vitsVoiceList.map((entry) => {
                    return { ...entry, packageName: `vits-${entry.name}` };
                });

                break;
            }
        }

        if (cacheFilePath) {
            await writeFileSafe(
                cacheFilePath,
                stringifyAndFormatJson(voiceList)
            );
        }

        return voiceList;
    }

    let voiceList: SynthesisVoice[];

    if (
        cacheFilePath &&
        existsSync(cacheFilePath) &&
        (await isFileIsUpToDate(cacheFilePath, options.cache!.duration!))
    ) {
        voiceList = await readAndParseJsonFile(cacheFilePath);
    } else {
        voiceList = await loadVoiceList();
    }

    console.log("voiceList");
    console.log(voiceList);

    const languageCode = await normalizeIdentifierToLanguageCode(
        options.language || ""
    );

    if (languageCode) {
        let filteredVoiceList = voiceList.filter((voice) =>
            voice.languages.includes(languageCode)
        );

        if (filteredVoiceList.length == 0 && languageCode.includes("-")) {
            const shortLanguageCode = getShortLanguageCode(languageCode);

            filteredVoiceList = voiceList.filter((voice) =>
                voice.languages.includes(shortLanguageCode)
            );
        }

        voiceList = filteredVoiceList;
    }

    if (options.voiceGender) {
        const genderLowercase = options.voiceGender.toLowerCase();
        voiceList = voiceList.filter(
            (voice) =>
                voice.gender == genderLowercase || voice.gender == "unknown"
        );
    }

    if (options.voice) {
        const namePatternLowerCase = options.voice.toLocaleLowerCase();
        const namePatternParts = namePatternLowerCase.split(/\b/g);

        if (namePatternParts.length > 1) {
            voiceList = voiceList.filter((voice) =>
                voice.name.toLocaleLowerCase().includes(namePatternLowerCase)
            );
        } else {
            voiceList = voiceList.filter((voice) => {
                const name = voice.name.toLocaleLowerCase();
                const nameParts = name.split(/\b/g);

                for (const namePart of nameParts) {
                    if (namePart.startsWith(namePatternLowerCase)) {
                        return true;
                    }
                }

                return false;
            });
        }
    }

    let bestMatchingVoice = voiceList[0];

    if (
        bestMatchingVoice &&
        voiceList.length > 1 &&
        defaultDialectForLanguageCode[languageCode]
    ) {
        const expandedLanguageCode =
            defaultDialectForLanguageCode[languageCode];

        for (const voice of voiceList) {
            if (voice.languages.includes(expandedLanguageCode)) {
                bestMatchingVoice = voice;
                break;
            }
        }
    }

    return { voiceList, bestMatchingVoice };
}

interface RequestVoiceListResult {
    voiceList: SynthesisVoice[];
    bestMatchingVoice: SynthesisVoice;
}

function getAllLangCodesFromVoiceList(voiceList: SynthesisVoice[]) {
    const languageCodes = new Set<string>();
    const langList: string[] = [];

    for (const voice of voiceList) {
        for (const langCode of voice.languages) {
            if (languageCodes.has(langCode)) {
                continue;
            }

            langList.push(langCode);
            languageCodes.add(langCode);
        }
    }

    return langList;
}

interface VoiceListRequestOptions extends SynthesisOptions {
    cache?: {
        path?: string;
        duration?: number;
    };
}

const defaultVoiceListRequestOptions: VoiceListRequestOptions = {
    ...defaultSynthesisOptions,

    cache: {
        path: undefined,
        duration: 60 * 1,
    },
};

interface SynthesisSegmentEventData {
    index: number;
    total: number;
    audio: RawAudio | Buffer;
    timeline: Timeline;
    transcript: string;
    language: string;
    peakDecibelsSoFar: number;
}

type SynthesisSegmentEvent = (data: SynthesisSegmentEventData) => Promise<void>;

export interface SynthesisVoice {
    name: string;
    languages: string[];
    gender: VoiceGender;
    speakerCount?: number;
    packageName?: string;
}

type VoiceGender = "male" | "female" | "unknown";

type ParagraphBreakType = "single" | "double";
type WhitespaceProcessing = "preserve" | "removeLineBreaks" | "collapse";

function splitToParagraphs(
    text: string,
    paragraphBreaks: ParagraphBreakType,
    whitespace: WhitespaceProcessing
) {
    let paragraphs: string[] = [];

    if (paragraphBreaks == "single") {
        paragraphs = text.split(/(\r?\n)+/g);
    } else if (paragraphBreaks == "double") {
        paragraphs = text.split(/(\r?\n)(\r?\n)+/g);
    } else {
        throw new Error(`Invalid paragraph break type: ${paragraphBreaks}`);
    }

    if (whitespace == "removeLineBreaks") {
        paragraphs = paragraphs.map((p) => p.replaceAll(/(\r?\n)+/g, " "));
    } else if (whitespace == "collapse") {
        paragraphs = paragraphs.map((p) => p.replaceAll(/\s+/g, " "));
    }

    paragraphs = paragraphs.map((p) => p.trim());
    paragraphs = paragraphs.filter((p) => p.length > 0);

    return paragraphs;
}
