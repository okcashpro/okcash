// Current image recognition service -- local recognition working, no openai recognition
import { models } from "@ai16z/eliza";
import { Service } from "@ai16z/eliza";
import { IAgentRuntime, ModelProviderName, ServiceType } from "@ai16z/eliza";
import {
    AutoProcessor,
    AutoTokenizer,
    env,
    Florence2ForConditionalGeneration,
    Florence2Processor,
    PreTrainedModel,
    PreTrainedTokenizer,
    RawImage,
    type Tensor,
} from "@huggingface/transformers";
import fs from "fs";
import gifFrames from "gif-frames";
import os from "os";
import path from "path";

export class ImageDescriptionService extends Service {
    private modelId: string = "onnx-community/Florence-2-base-ft";
    private device: string = "gpu";
    private model: PreTrainedModel | null = null;
    private processor: Florence2Processor | null = null;
    private tokenizer: PreTrainedTokenizer | null = null;
    private initialized: boolean = false;

    static serviceType: ServiceType = ServiceType.IMAGE_DESCRIPTION;

    private queue: string[] = [];
    private processing: boolean = false;

    constructor() {
        super();
    }

    async initialize(
        device: string | null = null,
        runtime: IAgentRuntime
    ): Promise<void> {
        if (this.initialized) {
            return;
        }

        const model = models[runtime.character.settings.model];

        if (model === ModelProviderName.LLAMALOCAL) {
            this.modelId = "onnx-community/Florence-2-base-ft";

            env.allowLocalModels = false;
            env.allowRemoteModels = true;
            env.backends.onnx.logLevel = "fatal";
            env.backends.onnx.wasm.proxy = false;
            env.backends.onnx.wasm.numThreads = 1;

            console.log("Downloading model...");

            this.model =
                await Florence2ForConditionalGeneration.from_pretrained(
                    this.modelId,
                    {
                        device: "gpu",
                        progress_callback: (progress) => {
                            if (progress.status === "downloading") {
                                console.log(
                                    `Model download progress: ${JSON.stringify(progress)}`
                                );
                            }
                        },
                    }
                );

            console.log("Model downloaded successfully.");

            this.processor = (await AutoProcessor.from_pretrained(
                this.modelId
            )) as Florence2Processor;
            this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
        } else {
            this.modelId = "gpt-4o-mini";
            this.device = "cloud";
        }

        this.initialized = true;
    }

    async describeImage(
        imageUrl: string,
        device?: string,
        runtime?: IAgentRuntime
    ): Promise<{ title: string; description: string }> {
        this.initialize(device, runtime);

        if (this.device === "cloud") {
            return this.recognizeWithOpenAI(imageUrl, runtime);
        } else {
            this.queue.push(imageUrl);
            this.processQueue();

            return new Promise((resolve, reject) => {
                const checkQueue = () => {
                    const index = this.queue.indexOf(imageUrl);
                    if (index !== -1) {
                        setTimeout(checkQueue, 100);
                    } else {
                        resolve(this.processImage(imageUrl));
                    }
                };
                checkQueue();
            });
        }
    }

    private async recognizeWithOpenAI(
        imageUrl: string,
        runtime
    ): Promise<{ title: string; description: string }> {
        const isGif = imageUrl.toLowerCase().endsWith(".gif");
        let imageData: Buffer | null = null;

        try {
            if (isGif) {
                console.log("Processing GIF: extracting first frame");
                const { filePath } =
                    await this.extractFirstFrameFromGif(imageUrl);
                imageData = fs.readFileSync(filePath);
            } else {
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch image: ${response.statusText}`
                    );
                }
                imageData = Buffer.from(await response.arrayBuffer());
            }

            if (!imageData || imageData.length === 0) {
                throw new Error("Failed to fetch image data");
            }

            const prompt =
                "Describe this image and give it a title. The first line should be the title, and then a line break, then a detailed description of the image. Respond with the format 'title\ndescription'";

            const text = await this.requestOpenAI(
                imageUrl,
                imageData,
                prompt,
                isGif,
                runtime
            );
            const title = text.split("\n")[0];
            const description = text.split("\n").slice(1).join("\n");
            return { title, description };
        } catch (error) {
            console.error("Error in recognizeWithOpenAI:", error);
            throw error;
        }
    }

    private async requestOpenAI(
        imageUrl: string,
        imageData: Buffer,
        prompt: string,
        isGif: boolean,
        runtime: IAgentRuntime
    ): Promise<string> {
        for (let retryAttempts = 0; retryAttempts < 3; retryAttempts++) {
            try {
                let body;
                if (isGif) {
                    const base64Image = imageData.toString("base64");
                    body = JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: prompt },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:image/png;base64,${base64Image}`,
                                        },
                                    },
                                ],
                            },
                        ],
                        max_tokens: 500,
                    });
                } else {
                    body = JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: prompt },
                                    {
                                        type: "image_url",
                                        image_url: { url: imageUrl },
                                    },
                                ],
                            },
                        ],
                        max_tokens: 300,
                    });
                }

                const response = await fetch(
                    "https://api.openai.com/v1/chat/completions",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${runtime.getSetting("OPENAI_API_KEY")}`,
                        },
                        body: body,
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;
            } catch (error) {
                console.log(
                    `Error during OpenAI request (attempt ${retryAttempts + 1}):`,
                    error
                );
                if (retryAttempts === 2) {
                    throw error;
                }
            }
        }
        throw new Error(
            "Failed to recognize image with OpenAI after 3 attempts"
        );
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const imageUrl = this.queue.shift();
            await this.processImage(imageUrl);
        }

        this.processing = false;
    }

    private async processImage(
        imageUrl: string
    ): Promise<{ title: string; description: string }> {
        console.log("***** PROCESSING IMAGE", imageUrl);
        const isGif = imageUrl.toLowerCase().endsWith(".gif");
        let imageToProcess = imageUrl;

        try {
            if (isGif) {
                console.log("Processing GIF: extracting first frame");
                const { filePath } =
                    await this.extractFirstFrameFromGif(imageUrl);
                imageToProcess = filePath;
            }

            const image = await RawImage.fromURL(imageToProcess);
            const visionInputs = await this.processor(image);

            const prompts =
                this.processor.construct_prompts("<DETAILED_CAPTION>");
            const textInputs = this.tokenizer(prompts);

            console.log("***** GENERATING");

            const generatedIds = (await this.model.generate({
                ...textInputs,
                ...visionInputs,
                max_new_tokens: 256,
            })) as Tensor;

            console.log("***** GENERATED IDS", generatedIds);

            const generatedText = this.tokenizer.batch_decode(generatedIds, {
                skip_special_tokens: false,
            })[0];

            console.log("***** GENERATED TEXT");
            console.log(generatedText);

            const result = this.processor.post_process_generation(
                generatedText,
                "<DETAILED_CAPTION>",
                image.size
            );

            console.log("***** RESULT");
            console.log(result);

            const detailedCaption = result["<DETAILED_CAPTION>"] as string;

            // TODO: handle this better

            return { title: detailedCaption, description: detailedCaption };
        } catch (error) {
            console.error("Error in processImage:", error);
        } finally {
            if (isGif && imageToProcess !== imageUrl) {
                fs.unlinkSync(imageToProcess);
            }
        }
    }

    private async extractFirstFrameFromGif(
        gifUrl: string
    ): Promise<{ filePath: string }> {
        const frameData = await gifFrames({
            url: gifUrl,
            frames: 1,
            outputType: "png",
        });
        const firstFrame = frameData[0];

        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `gif_frame_${Date.now()}.png`);

        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(tempFilePath);
            firstFrame.getImage().pipe(writeStream);

            writeStream.on("finish", () => {
                resolve({ filePath: tempFilePath });
            });

            writeStream.on("error", reject);
        });
    }
}

export default ImageDescriptionService;
