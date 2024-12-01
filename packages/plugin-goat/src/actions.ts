import {
    type WalletClient,
    type Plugin,
    getDeferredTools,
    addParametersToDescription,
    type ChainForWalletClient,
    type DeferredTool,
} from "@goat-sdk/core";
import {
    type Action,
    generateText,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    composeContext,
    generateObjectV2,
} from "@ai16z/eliza";

type GetOnChainActionsParams<TWalletClient extends WalletClient> = {
    chain: ChainForWalletClient<TWalletClient>;
    getWalletClient: (runtime: IAgentRuntime) => Promise<TWalletClient>;
    plugins: Plugin<TWalletClient>[];
    supportsSmartWallets?: boolean;
};

/**
 * Get all the on chain actions for the given wallet client and plugins
 *
 * @param params
 * @returns
 */
export async function getOnChainActions<TWalletClient extends WalletClient>({
    getWalletClient,
    plugins,
    chain,
    supportsSmartWallets,
}: GetOnChainActionsParams<TWalletClient>): Promise<Action[]> {
    const tools = await getDeferredTools<TWalletClient>({
        plugins,
        wordForTool: "action",
        chain,
        supportsSmartWallets,
    });

    return tools
        .map((action) => ({
            ...action,
            name: action.name.toUpperCase(),
        }))
        .map((tool) => createAction(tool, getWalletClient));
}

function createAction<TWalletClient extends WalletClient>(
    tool: DeferredTool<TWalletClient>,
    getWalletClient: (runtime: IAgentRuntime) => Promise<TWalletClient>
): Action {
    return {
        name: tool.name,
        similes: [],
        description: tool.description,
        validate: async () => true,
        handler: async (
            runtime: IAgentRuntime,
            message: Memory,
            state: State | undefined,
            options?: Record<string, unknown>,
            callback?: HandlerCallback
        ): Promise<boolean> => {
            try {
                const walletClient = await getWalletClient(runtime);
                let currentState =
                    state ?? (await runtime.composeState(message));
                currentState =
                    await runtime.updateRecentMessageState(currentState);

                const parameterContext = composeParameterContext(
                    tool,
                    currentState
                );
                const parameters = await generateParameters(
                    runtime,
                    parameterContext,
                    tool
                );

                const parsedParameters = tool.parameters.safeParse(parameters);
                if (!parsedParameters.success) {
                    callback?.({
                        text: `Invalid parameters for action ${tool.name}: ${parsedParameters.error.message}`,
                        content: { error: parsedParameters.error.message },
                    });
                    return false;
                }

                const result = await tool.method(
                    walletClient,
                    parsedParameters.data
                );
                const responseContext = composeResponseContext(
                    tool,
                    result,
                    currentState
                );
                const response = await generateResponse(
                    runtime,
                    responseContext
                );

                callback?.({ text: response, content: result });
                return true;
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                callback?.({
                    text: `Error executing action ${tool.name}: ${errorMessage}`,
                    content: { error: errorMessage },
                });
                return false;
            }
        },
        examples: [],
    };
}

function composeParameterContext<TWalletClient extends WalletClient>(
    tool: DeferredTool<TWalletClient>,
    state: State
): string {
    const contextTemplate = `{{recentMessages}}

Given the recent messages, extract the following information for the action "${tool.name}":
${addParametersToDescription("", tool.parameters)}
`;
    return composeContext({ state, template: contextTemplate });
}

async function generateParameters<TWalletClient extends WalletClient>(
    runtime: IAgentRuntime,
    context: string,
    tool: DeferredTool<TWalletClient>
): Promise<unknown> {
    const { object } = await generateObjectV2({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
        schema: tool.parameters,
    });

    return object;
}

function composeResponseContext<TWalletClient extends WalletClient>(
    tool: DeferredTool<TWalletClient>,
    result: unknown,
    state: State
): string {
    const responseTemplate = `
    # Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

The action "${tool.name}" was executed successfully.
Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
  `;
    return composeContext({ state, template: responseTemplate });
}

async function generateResponse(
    runtime: IAgentRuntime,
    context: string
): Promise<string> {
    return generateText({
        runtime,
        context,
        modelClass: ModelClass.SMALL,
    });
}
