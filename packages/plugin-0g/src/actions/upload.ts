import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    ModelClass,
    Content,
    ActionExample,
    generateObject,
} from "@ai16z/eliza";
import { Indexer, ZgFile, getFlowContract } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import { composeContext } from "@ai16z/eliza";
import { promises as fs } from "fs";

import { uploadTemplate } from "../templates/upload";

export interface UploadContent extends Content {
    filePath: string;
}

function isUploadContent(
    _runtime: IAgentRuntime,
    content: any
): content is UploadContent {
    console.log("Content for upload", content);
    return typeof content.filePath === "string";
}

export const zgUpload: Action = {
    name: "ZG_UPLOAD",
    similes: [
        "UPLOAD_FILE_TO_ZG",
        "STORE_FILE_ON_ZG",
        "SAVE_FILE_TO_ZG",
        "UPLOAD_TO_ZERO_GRAVITY",
        "STORE_ON_ZERO_GRAVITY",
        "SHARE_FILE_ON_ZG",
        "PUBLISH_FILE_TO_ZG",
    ],
    description: "Store data using 0G protocol",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const zgIndexerRpc = !!runtime.getSetting("ZEROG_INDEXER_RPC");
        const zgEvmRpc = !!runtime.getSetting("ZEROG_EVM_RPC");
        const zgPrivateKey = !!runtime.getSetting("ZEROG_PRIVATE_KEY");
        const flowAddr = !!runtime.getSetting("ZEROG_FLOW_ADDRESS");
        return zgIndexerRpc && zgEvmRpc && zgPrivateKey && flowAddr;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        console.log("ZG_UPLOAD action called");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose upload context
        const uploadContext = composeContext({
            state,
            template: uploadTemplate,
        });

        // Generate upload content
        const content = await generateObject({
            runtime,
            context: uploadContext,
            modelClass: ModelClass.LARGE,
        });

        // Validate upload content
        if (!isUploadContent(runtime, content)) {
            console.error("Invalid content for UPLOAD action.");
            if (callback) {
                callback({
                    text: "Unable to process 0G upload request. Invalid content provided.",
                    content: { error: "Invalid upload content" },
                });
            }
            return false;
        }

        try {
            const zgIndexerRpc = runtime.getSetting("ZEROG_INDEXER_RPC");
            const zgEvmRpc = runtime.getSetting("ZEROG_EVM_RPC");
            const zgPrivateKey = runtime.getSetting("ZEROG_PRIVATE_KEY");
            const flowAddr = runtime.getSetting("ZEROG_FLOW_ADDRESS");
            const filePath = content.filePath;
            if (!filePath) {
                console.error("File path is required");
                return false;
            }

            // Check if file exists and is accessible
            try {
                await fs.access(filePath);
            } catch (error) {
                console.error(
                    `File ${filePath} does not exist or is not accessible:`,
                    error
                );
                return false;
            }

            const file = await ZgFile.fromFilePath(filePath);
            var [tree, err] = await file.merkleTree();
            if (err === null) {
                console.log("File Root Hash: ", tree.rootHash());
            } else {
                console.log("Error getting file root hash: ", err);
                return false;
            }

            const provider = new ethers.JsonRpcProvider(zgEvmRpc);
            const signer = new ethers.Wallet(zgPrivateKey, provider);
            const indexer = new Indexer(zgIndexerRpc);
            const flowContract = getFlowContract(flowAddr, signer);

            var [tx, err] = await indexer.upload(
                file,
                0,
                zgEvmRpc,
                flowContract
            );
            if (err === null) {
                console.log("File uploaded successfully, tx: ", tx);
            } else {
                console.error("Error uploading file: ", err);
                return false;
            }

            await file.close();
        } catch (error) {
            console.error("Error getting settings for 0G upload:", error);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "upload my resume.pdf file",
                    action: "ZG_UPLOAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you help me upload this document.docx?",
                    action: "ZG_UPLOAD",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to upload an image file image.png",
                    action: "ZG_UPLOAD",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
