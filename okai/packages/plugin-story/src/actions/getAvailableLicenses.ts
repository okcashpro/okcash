import {
    composeContext,
    okaiLogger,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@okcashpro/okai";
import { getAvailableLicensesTemplate, licenseIPTemplate } from "../templates";
import { Address } from "viem";
import { IPLicenseDetails, RESOURCE_TYPE } from "../types/api";
import { API_KEY, API_URL } from "../lib/api";
import { storyOdyssey } from "viem/chains";

export { licenseIPTemplate };

// Types for request/response
type GetAvailableLicensesParams = {
    ipid: Address;
};

type GetAvailableLicensesResponse = {
    data: IPLicenseDetails[];
};

/**
 * Class to handle fetching available licenses for an IP asset from Story Protocol
 */
export class GetAvailableLicensesAction {
    // Default query options for license terms
    private readonly defaultQueryOptions = {
        pagination: { limit: 10, offset: 0 },
        orderBy: "blockNumber",
        orderDirection: "desc",
    };

    async getAvailableLicenses(
        params: GetAvailableLicensesParams
    ): Promise<GetAvailableLicensesResponse> {
        okaiLogger.log(
            "Fetching from",
            `${API_URL}/${RESOURCE_TYPE.IP_LICENSE_DETAILS}`
        );

        const response = await fetch(
            `${API_URL}/${RESOURCE_TYPE.IP_LICENSE_DETAILS}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": API_KEY,
                    "x-chain": storyOdyssey.id.toString(),
                },
                cache: "no-cache",
                body: JSON.stringify({
                    ip_ids: [params.ipid],
                    options: this.defaultQueryOptions,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        try {
            const text = await response.text();
            const licenseDetailsResponse = JSON.parse(text);
            okaiLogger.log("licenseDetailsResponse", licenseDetailsResponse);
            return licenseDetailsResponse;
        } catch (e) {
            okaiLogger.error("Failed to parse response");
            throw new Error(`Failed to parse JSON response: ${e.message}`);
        }
    }
}

/**
 * Formats a license's terms into a human-readable string
 */
const formatLicenseTerms = (license: IPLicenseDetails): string => {
    const terms = license.terms;
    return `License ID: ${license.id}
- Terms:
  • Commercial Use: ${terms.commercialUse ? "Allowed" : "Not Allowed"}
  • Commercial Attribution: ${terms.commercialAttribution ? "Required" : "Not Required"}
  • Derivatives: ${terms.derivativesAllowed ? "Allowed" : "Not Allowed"}
  • Derivatives Attribution: ${terms.derivativesAttribution ? "Required" : "Not Required"}
  • Derivatives Approval: ${terms.derivativesApproval ? "Required" : "Not Required"}
  • Revenue Share: ${terms.commercialRevenueShare ? terms.commercialRevenueShare + "%" : "Not Required"}
`;
};

/**
 * Main action configuration for getting available licenses
 */
export const getAvailableLicensesAction = {
    name: "GET_AVAILABLE_LICENSES",
    description: "Get available licenses for an IP Asset on Story",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        okaiLogger.log("Starting GET_AVAILABLE_LICENSES handler...");

        // Initialize or update state
        state = !state
            ? ((await runtime.composeState(message)) as State)
            : await runtime.updateRecentMessageState(state);

        // Generate parameters from context
        const content = await generateObjectDeprecated({
            runtime,
            context: composeContext({
                state,
                template: getAvailableLicensesTemplate,
            }),
            modelClass: ModelClass.SMALL,
        });

        // Fetch and format license data
        const action = new GetAvailableLicensesAction();
        try {
            const response = await action.getAvailableLicenses(content);
            const formattedResponse = response.data
                .map(formatLicenseTerms)
                .join("\n");

            callback?.({
                text: formattedResponse,
                action: "GET_AVAILABLE_LICENSES",
                source: "Story Protocol API",
            });
            return true;
        } catch (e) {
            okaiLogger.error("Error fetching available licenses:", e.message);
            callback?.({
                text: `Error fetching available licenses: ${e.message}`,
            });
            return false;
        }
    },
    template: getAvailableLicensesTemplate,
    validate: async () => true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get available licenses for an IP Asset 0x2265F2b8e47F98b3Bdf7a1937EAc27282954A4Db",
                    action: "GET_AVAILABLE_LICENSES",
                },
            },
        ],
    ],
    similes: [
        "AVAILABLE_LICENSES",
        "AVAILABLE_LICENSES_FOR_IP",
        "AVAILABLE_LICENSES_FOR_ASSET",
    ],
};
