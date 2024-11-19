import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    Plugin,
    State,
    ModelClass,
    Content,
    ActionExample
} from "@ai16z/eliza";
import { Indexer, ZgFile, getFlowContract } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { composeContext } from "@ai16z/eliza";
import { generateObject } from "@ai16z/eliza";


const storageTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "filePath": null,
    "description": "I want to upload a file"
}
\`\`\`

{{recentMessages}}

Extract the user's intention to upload a file from the conversation. Users might express this in various ways, such as:
- "I want to upload a file"
- "upload an image"
- "send a photo"
- "upload"
- "let me share a file"

If the user provides any specific description of the file, include that as well.

Respond with a JSON markdown block containing only the extracted values.`;

export interface StorageContent extends Content {
    filePath: string;
}

function isStorageContent(
    _runtime: IAgentRuntime,
    content: any
): content is StorageContent {
    console.log("Content for storage", content);
    return (
        typeof content.filePath === "string"
    );
}

export const zgStorage: Action = {
    name: "ZG_STORAGE",
    similes: [
        "UPLOAD_FILE_TO_ZG",
        "STORE_FILE_ON_ZG",
        "SAVE_FILE_TO_ZG",
        "UPLOAD_TO_ZERO_GRAVITY",
        "STORE_ON_ZERO_GRAVITY",
        "SHARE_FILE_ON_ZG",
        "PUBLISH_FILE_TO_ZG"
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
        options: any,
        callback: HandlerCallback
    ) => {
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Compose storage context
        const storageContext = composeContext({
            state,
            template: storageTemplate,
        });

        // Generate storage content
        const content = await generateObject({
            runtime,
            context: storageContext,
            modelClass: ModelClass.SMALL,
        });

        // Validate storage content
        if (!isStorageContent(runtime, content)) {
            console.error("Invalid content for STORAGE action.");
            if (callback) {
                callback({
                    text: "Unable to process zg storage request. Invalid content provided.",
                    content: { error: "Invalid storage content" },
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

            const file = await ZgFile.fromFilePath(filePath);
            var [tree, err] = await file.merkleTree();
            if (err === null) {
                console.log("File Root Hash: ", tree.rootHash());
            } else {
                console.log("Error getting file root hash: ", err);
                return false;
            }
            await file.close();

            const provider = new ethers.JsonRpcProvider(zgEvmRpc);
            const signer = new ethers.Wallet(zgPrivateKey, provider);
            const indexer = new Indexer(zgIndexerRpc);
            const flowContract = getFlowContract(flowAddr, signer);

            var [tx, err] = await indexer.upload(file, 0, zgEvmRpc, flowContract);
            if (err === null) {
                console.log("File uploaded successfully, tx: ", tx);
                } else {
                console.log("Error uploading file: ", err);
                return false;
            }

        } catch (error) {
            console.error("Error getting settings for ZG storage:", error);
        }
    },
    examples: [[
        {
            user: "{{user1}}",
            content: { 
                text: "upload my resume.pdf file",
                action: "ZG_STORAGE"
            }
        }
    ], [
        {
            user: "{{user1}}", 
            content: { 
                text: "can you help me upload this document.docx?",
                action: "ZG_STORAGE"
            }
        }
    ], [
        {
            user: "{{user1}}", 
            content: { 
                text: "I need to upload an image file image.png",
                action: "ZG_STORAGE"
            }
        }
    ]] as ActionExample[][],
} as Action;
