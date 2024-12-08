import { Coinbase, readContract, SmartContract } from "@coinbase/coinbase-sdk";
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
import {
    contractInvocationTemplate,
    tokenContractTemplate,
    readContractTemplate,
} from "../templates";
import {
    ContractInvocationSchema,
    TokenContractSchema,
    isContractInvocationContent,
    isTokenContractContent,
    ReadContractSchema,
    isReadContractContent,
} from "../types";
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
    description:
        "Deploy an ERC20, ERC721, or ERC1155 token contract using the Coinbase SDK",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating runtime for DEPLOY_TOKEN_CONTRACT...");
        return (
            !!(
                runtime.character.settings.secrets?.COINBASE_API_KEY ||
                process.env.COINBASE_API_KEY
            ) &&
            !!(
                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||
                process.env.COINBASE_PRIVATE_KEY
            )
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
                apiKeyName:
                    runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                privateKey:
                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY,
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
            elizaLogger.log("Contract details:", contractDetails.object);

            if (!isTokenContractContent(contractDetails.object)) {
                callback(
                    {
                        text: "Invalid contract details. Please check the inputs.",
                    },
                    []
                );
                return;
            }

            const {
                contractType,
                name,
                symbol,
                network,
                baseURI,
                totalSupply,
            } = contractDetails.object;
            elizaLogger.log("Contract details:", contractDetails.object);
            const wallet = await initializeWallet(runtime, network);
            let contract: SmartContract;
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
                default:
                    throw new Error(
                        `Unsupported contract type: ${contractType}`
                    );
            }

            // Wait for deployment to complete
            await contract.wait();
            elizaLogger.log("Deployment details:", deploymentDetails);
            elizaLogger.log("Contract deployed successfully:", contract);
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
            const transaction =
                contract.getTransaction()?.getTransactionLink() || "";
            const contractAddress = contract.getContractAddress();
            await csvWriter.writeRecords([
                [
                    deploymentDetails.contractType,
                    name,
                    symbol,
                    network,
                    contractAddress,
                    transaction,
                    deploymentDetails.baseURI,
                    deploymentDetails.totalSupply || "",
                ],
            ]);

            callback(
                {
                    text: `Token contract deployed successfully:
- Type: ${deploymentDetails.contractType}
- Name: ${name}
- Symbol: ${symbol}
- Network: ${network}
- Contract Address: ${contractAddress}
- Transaction URL: ${transaction}
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
                    text: "Deploy an ERC721 token named 'MyNFT' with symbol 'MNFT' on base network with URI 'https://pbs.twimg.com/profile_images/1848823420336934913/oI0-xNGe_400x400.jpg'",
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
            {
                user: "{{user1}}",
                content: {
                    text: "Deploy an ERC721 token named 'MyNFT' with symbol 'MNFT' on the base network",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Token contract deployed successfully:
- Type: ERC721
- Name: MyNFT
- Symbol: MNFT
- Network: base
- Contract Address: 0x...
- Transaction URL: https://basescan.org/tx/...
- URI: https://pbs.twimg.com/profile_images/1848823420336934913/oI0-xNGe_400x400.jpg`,
                },
            },
        ],
    ],
    similes: ["DEPLOY_CONTRACT", "CREATE_TOKEN", "MINT_TOKEN", "CREATE_NFT"],
};

// Add to tokenContract.ts
export const invokeContractAction: Action = {
    name: "INVOKE_CONTRACT",
    description:
        "Invoke a method on a deployed smart contract using the Coinbase SDK",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating runtime for INVOKE_CONTRACT...");
        return (
            !!(
                runtime.character.settings.secrets?.COINBASE_API_KEY ||
                process.env.COINBASE_API_KEY
            ) &&
            !!(
                runtime.character.settings.secrets?.COINBASE_PRIVATE_KEY ||
                process.env.COINBASE_PRIVATE_KEY
            )
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
                apiKeyName:
                    runtime.getSetting("COINBASE_API_KEY") ??
                    process.env.COINBASE_API_KEY,
                privateKey:
                    runtime.getSetting("COINBASE_PRIVATE_KEY") ??
                    process.env.COINBASE_PRIVATE_KEY,
            });

            const context = composeContext({
                state,
                template: contractInvocationTemplate,
            });

            const invocationDetails = await generateObjectV2({
                runtime,
                context,
                modelClass: ModelClass.LARGE,
                schema: ContractInvocationSchema,
            });
            elizaLogger.log("Invocation details:", invocationDetails.object);
            if (!isContractInvocationContent(invocationDetails.object)) {
                callback(
                    {
                        text: "Invalid contract invocation details. Please check the inputs.",
                    },
                    []
                );
                return;
            }

            const { contractAddress, method, args, amount, assetId, network } =
                invocationDetails.object;

            const wallet = await initializeWallet(runtime, network);

            // Prepare invocation options
            const invocationOptions = {
                contractAddress,
                method,
                abi: [
                    {
                        constant: true,
                        inputs: [],
                        name: "name",
                        outputs: [
                            {
                                name: "",
                                type: "string",
                            },
                        ],
                        payable: false,
                        stateMutability: "view",
                        type: "function",
                    },
                    {
                        constant: false,
                        inputs: [
                            {
                                name: "_spender",
                                type: "address",
                            },
                            {
                                name: "_value",
                                type: "uint256",
                            },
                        ],
                        name: "approve",
                        outputs: [
                            {
                                name: "",
                                type: "bool",
                            },
                        ],
                        payable: false,
                        stateMutability: "nonpayable",
                        type: "function",
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: "totalSupply",
                        outputs: [
                            {
                                name: "",
                                type: "uint256",
                            },
                        ],
                        payable: false,
                        stateMutability: "view",
                        type: "function",
                    },
                    {
                        constant: false,
                        inputs: [
                            {
                                name: "_from",
                                type: "address",
                            },
                            {
                                name: "_to",
                                type: "address",
                            },
                            {
                                name: "_value",
                                type: "uint256",
                            },
                        ],
                        name: "transferFrom",
                        outputs: [
                            {
                                name: "",
                                type: "bool",
                            },
                        ],
                        payable: false,
                        stateMutability: "nonpayable",
                        type: "function",
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: "decimals",
                        outputs: [
                            {
                                name: "",
                                type: "uint8",
                            },
                        ],
                        payable: false,
                        stateMutability: "view",
                        type: "function",
                    },
                    {
                        constant: true,
                        inputs: [
                            {
                                name: "_owner",
                                type: "address",
                            },
                        ],
                        name: "balanceOf",
                        outputs: [
                            {
                                name: "balance",
                                type: "uint256",
                            },
                        ],
                        payable: false,
                        stateMutability: "view",
                        type: "function",
                    },
                    {
                        constant: true,
                        inputs: [],
                        name: "symbol",
                        outputs: [
                            {
                                name: "",
                                type: "string",
                            },
                        ],
                        payable: false,
                        stateMutability: "view",
                        type: "function",
                    },
                    {
                        constant: false,
                        inputs: [
                            {
                                name: "_to",
                                type: "address",
                            },
                            {
                                name: "_value",
                                type: "uint256",
                            },
                        ],
                        name: "transfer",
                        outputs: [
                            {
                                name: "",
                                type: "bool",
                            },
                        ],
                        payable: false,
                        stateMutability: "nonpayable",
                        type: "function",
                    },
                    {
                        constant: true,
                        inputs: [
                            {
                                name: "_owner",
                                type: "address",
                            },
                            {
                                name: "_spender",
                                type: "address",
                            },
                        ],
                        name: "allowance",
                        outputs: [
                            {
                                name: "",
                                type: "uint256",
                            },
                        ],
                        payable: false,
                        stateMutability: "view",
                        type: "function",
                    },
                    {
                        payable: true,
                        stateMutability: "payable",
                        type: "fallback",
                    },
                    {
                        anonymous: false,
                        inputs: [
                            {
                                indexed: true,
                                name: "owner",
                                type: "address",
                            },
                            {
                                indexed: true,
                                name: "spender",
                                type: "address",
                            },
                            {
                                indexed: false,
                                name: "value",
                                type: "uint256",
                            },
                        ],
                        name: "Approval",
                        type: "event",
                    },
                    {
                        anonymous: false,
                        inputs: [
                            {
                                indexed: true,
                                name: "from",
                                type: "address",
                            },
                            {
                                indexed: true,
                                name: "to",
                                type: "address",
                            },
                            {
                                indexed: false,
                                name: "value",
                                type: "uint256",
                            },
                        ],
                        name: "Transfer",
                        type: "event",
                    },
                ],
                args,
                ...(amount && assetId ? { amount, assetId } : {}),
            };
            elizaLogger.log("Invocation options:", invocationOptions);
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

            await csvWriter.writeRecords([
                [
                    contractAddress,
                    method,
                    network,
                    invocation.getStatus(),
                    invocation.getTransactionLink() || "",
                    amount || "",
                    assetId || "",
                ],
            ]);

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
                    text: " Call the 'transfer' method on my ERC20 token contract at 0x37f2131ebbc8f97717edc3456879ef56b9f4b97b  with amount 100 to recepient 0xbcF7C64B880FA89a015970dC104E848d485f99A3",
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

export const readContractAction: Action = {
    name: "READ_CONTRACT",
    description: "Read data from a deployed smart contract using the Coinbase SDK",
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.log("Validating runtime for READ_CONTRACT...");
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
        elizaLogger.log("Starting READ_CONTRACT handler...");

        try {
            Coinbase.configure({
                apiKeyName: runtime.getSetting("COINBASE_API_KEY") ?? process.env.COINBASE_API_KEY,
                privateKey: runtime.getSetting("COINBASE_PRIVATE_KEY") ?? process.env.COINBASE_PRIVATE_KEY,
            });

            const context = composeContext({
                state,
                template: readContractTemplate,
            });

            const readDetails = await generateObjectV2({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: ReadContractSchema,
            });

            if (!isReadContractContent(readDetails.object)) {
                callback(
                    {
                        text: "Invalid contract read details. Please check the inputs.",
                    },
                    []
                );
                return;
            }

            const { contractAddress, method, args, network } = readDetails.object;
            const result = await readContract({
                networkId: network,
                contractAddress,
                method,
                args,
            });

            callback(
                {
                    text: `Contract read successful:
- Contract Address: ${contractAddress}
- Method: ${method}
- Network: ${network}
- Result: ${JSON.stringify(result, null, 2)}`,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error reading contract:", error);
            callback(
                {
                    text: `Error reading contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
                    text: "Read the balance of address 0xbcF7C64B880FA89a015970dC104E848d485f99A3 from the ERC20 contract at 0x37f2131ebbc8f97717edc3456879ef56b9f4b97b",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: `Contract read successful:
- Contract Address: 0x37f2131ebbc8f97717edc3456879ef56b9f4b97b
- Method: balanceOf
- Network: eth
- Result: "1000000"`,
                },
            },
        ],
    ],
    similes: ["READ_CONTRACT", "GET_CONTRACT_DATA", "QUERY_CONTRACT"],
};

export const tokenContractPlugin: Plugin = {
    name: "tokenContract",
    description: "Enables deployment, invocation, and reading of ERC20, ERC721, and ERC1155 token contracts using the Coinbase SDK",
    actions: [deployTokenContractAction, invokeContractAction, readContractAction],
};
