import { Coinbase } from "@coinbase/coinbase-sdk";
import {
    Action,
    Plugin,
    elizaLogger,
    IAgentRuntime,
    Memory,
    HandlerCallback,
    State,
    composeContext,
    generateObjectV2,
    ModelClass,
} from "@ai16z/eliza";
import { initializeWallet } from "../utils";
import { contractInvocationTemplate, tokenContractTemplate } from "../templates";
import { ContractInvocationSchema, TokenContractSchema, isContractInvocationContent, isTokenContractContent } from "../types";
import path from "path";
import { fileURLToPath } from "url";
import { createArrayCsvWriter } from "csv-writer";
import fs from "fs";

// Dynamically resolve the file path to the src/plugins directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, "../../plugin-coinbase/src/plugins");
const contractsCsvFilePath = path.join(baseDir, "contracts.csv");

export const deployTokenContractAction: Action = {
    name: "DEPLOY_TOKEN_CONTRACT",
    description: "Deploy an ERC20, ERC721, or ERC1155 token contract using the Coinbase SDK",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating runtime for DEPLOY_TOKEN_CONTRACT...");
        return !!(
            runtime.character.settings.secrets?.COINBASE_API_KEY ||
            process.env.COINBASE_API_KEY
        ) && !!(
            runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||
            process.env.COINBASE_PRIVATE_KEY
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Starting DEPLOY_TOKEN_CONTRACT handler...");

        try {
            Coinbase.configure({
                apiKeyName: runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
                privateKey: runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY,
            });

            // Ensure CSV file exists
            if (!fs.existsSync(contractsCsvFilePath)) {
                const csvWriter = createArrayCsvWriter({
                    path: contractsCsvFilePath,
                    header: [
                        "Contract Type",
                        "Name",
                        "Symbol",
                        "Network",
                        "Contract Address",
                        "Transaction URL",
                        "Base URI",
                        "Total Supply",
                    ],
                });
                await csvWriter.writeRecords([]);
            }

            const context = composeContext({
                state,
                template: tokenContractTemplate,
            });

            const contractDetails = await generateObjectV2({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: TokenContractSchema,
            });

            if (!isTokenContractContent(contractDetails.object)) {
                callback(
                    {
                        text: "Invalid contract details. Please check the inputs.",
                    },
                    []
                );
                return;
            }

            const { contractType, name, symbol, network, baseURI, totalSupply } = contractDetails.object;

            const wallet = await initializeWallet(runtime, network);
            let contract;
            let deploymentDetails;

            switch (contractType.toLowerCase()) {
                case "erc20":
                    contract = await wallet.deployToken({
                        name,
                        symbol,
                        totalSupply: totalSupply || 1000000,
                    });
                    deploymentDetails = {
                        contractType: "ERC20",
                        totalSupply,
                        baseURI: "N/A",
                    };
                    break;

                case "erc721":
                    contract = await wallet.deployNFT({
                        name,
                        symbol,
                        baseURI: baseURI || "",
                    });
                    deploymentDetails = {
                        contractType: "ERC721",
                        totalSupply: "N/A",
                        baseURI,
                    };
                    break;

                case "erc1155":
                    contract = await wallet.deployMultiToken({
                        uri: baseURI || "",
                    });
                    deploymentDetails = {
                        contractType: "ERC1155",
                        totalSupply: "N/A",
                        baseURI,
                    };
                    break;

                default:
                    throw new Error(`Unsupported contract type: ${contractType}`);
            }

            // Wait for deployment to complete
            await contract.waitForDeployment();

            // Log deployment to CSV
            const csvWriter = createArrayCsvWriter({
                path: contractsCsvFilePath,
                header: [
                    "Contract Type",
                    "Name",
                    "Symbol",
                    "Network",
                    "Contract Address",
                    "Transaction URL",
                    "Base URI",
                    "Total Supply",
                ],
                append: true,
            });

            await csvWriter.writeRecords([[
                deploymentDetails.contractType,
                name,
                symbol,
                network,
                contract.getAddress(),
                contract.getDeploymentTransaction()?.getTransactionLink() || "",
                deploymentDetails.baseURI,
                deploymentDetails.totalSupply || "",
            ]]);

            callback(
                {
                    text: `Token contract deployed successfully:
- Type: ${deploymentDetails.contractType}
- Name: ${name}
- Symbol: ${symbol}
- Network: ${network}
- Contract Address: ${contract.getAddress()}
- Transaction URL: ${contract.getDeploymentTransaction()?.getTransactionLink() || "N/A"}
${deploymentDetails.baseURI !== "N/A" ? `- Base URI: ${deploymentDetails.baseURI}` : ""}
${deploymentDetails.totalSupply !== "N/A" ? `- Total Supply: ${deploymentDetails.totalSupply}` : ""}

Contract deployment has been logged to the CSV file.`,
                },
                []
            );

        } catch (error) {
            elizaLogger.error("Error deploying token contract:", error);
            callback(
                {
                    text: "Failed to deploy token contract. Please check the logs for more details.",
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy an ERC20 token named 'MyToken' with symbol 'MTK' on the base network",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Token contract deployed successfully:
- Type: ERC20
- Name: MyToken
- Symbol: MTK
- Network: base
- Contract Address: 0x...
- Transaction URL: https://basescan.org/tx/...
- Total Supply: 1000000`,
                },
            },
        ],
    ],
    similes: ["DEPLOY_CONTRACT", "CREATE_TOKEN", "MINT_TOKEN", "CREATE_NFT"],
};

// Add to tokenContract.ts
export const invokeContractAction: Action = {
    name: "INVOKE_CONTRACT",
    description: "Invoke a method on a deployed smart contract using the Coinbase SDK",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating runtime for INVOKE_CONTRACT...");
        return !!(
            runtime.character.settings.secrets?.COINBASE_API_KEY ||
            process.env.COINBASE_API_KEY
        ) && !!(
            runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||
            process.env.COINBASE_PRIVATE_KEY
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback: HandlerCallback
    ) => {
        elizaLogger.log("Starting INVOKE_CONTRACT handler...");

        try {
            Coinbase.configure({
                apiKeyName: runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
                privateKey: runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY,
            });

            const context = composeContext({
                state,
                template: contractInvocationTemplate,
            });

            const invocationDetails = await generateObjectV2({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: ContractInvocationSchema,
            });

            if (!isContractInvocationContent(invocationDetails.object)) {
                callback(
                    {
                        text: "Invalid contract invocation details. Please check the inputs.",
                    },
                    []
                );
                return;
            }

            const { contractAddress, method, abi, args, amount, assetId, network } = invocationDetails.object;

            const wallet = await initializeWallet(runtime, network);

            // Prepare invocation options
            const invocationOptions = {
                contractAddress,
                method,
                abi,
                args,
                ...(amount && assetId ? { amount, assetId } : {}),
            };

            // Invoke the contract
            const invocation = await wallet.invokeContract(invocationOptions);

            // Wait for the transaction to be mined
            await invocation.wait();

            // Log the invocation to CSV
            const csvWriter = createArrayCsvWriter({
                path: contractsCsvFilePath,
                header: [
                    "Contract Address",
                    "Method",
                    "Network",
                    "Status",
                    "Transaction URL",
                    "Amount",
                    "Asset ID",
                ],
                append: true,
            });

            await csvWriter.writeRecords([[
                contractAddress,
                method,
                network,
                invocation.getStatus(),
                invocation.getTransactionLink() || "",
                amount || "",
                assetId || "",
            ]]);

            callback(
                {
                    text: `Contract method invoked successfully:
- Contract Address: ${contractAddress}
- Method: ${method}
- Network: ${network}
- Status: ${invocation.getStatus()}
- Transaction URL: ${invocation.getTransactionLink() || "N/A"}
${amount ? `- Amount: ${amount}` : ""}
${assetId ? `- Asset ID: ${assetId}` : ""}

Contract invocation has been logged to the CSV file.`,
                },
                []
            );

        } catch (error) {
            elizaLogger.error("Error invoking contract method:", error);
            callback(
                {
                    text: "Failed to invoke contract method. Please check the logs for more details.",
                },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Call the 'transfer' method on my ERC20 token contract at 0x123... with amount 100",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Contract method invoked successfully:
- Contract Address: 0x123...
- Method: transfer
- Network: base
- Status: SUCCESS
- Transaction URL: https://basescan.org/tx/...
- Amount: 100
- Asset ID: wei

Contract invocation has been logged to the CSV file.`,
                },
            },
        ],
    ],
    similes: ["CALL_CONTRACT", "EXECUTE_CONTRACT", "INTERACT_WITH_CONTRACT"],
};

export const tokenContractPlugin: Plugin = {
    name: "tokenContract",
    description: "Enables deployment and invoking of ERC20, ERC721, and ERC1155 token contracts using the Coinbase SDK",
    actions: [deployTokenContractAction, invokeContractAction],
};