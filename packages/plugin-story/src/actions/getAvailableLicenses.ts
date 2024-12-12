import {
    composeContext,
    elizaLogger,
    generateObjectDEPRECATED,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@ai16z/eliza";
import { getAvailableLicensesTemplate, licenseIPTemplate } from "../templates";
import { Address } from "viem";
import { IPLicenseDetails, RESOURCE_TYPE } from "../types/api";
import { API_KEY, API_URL } from "../lib/api";
import { storyOdyssey } from "viem/chains";

export { licenseIPTemplate };

type GetAvailableLicensesParams = {
    ipid: Address;
};

type GetAvailableLicensesResponse = {
    data: IPLicenseDetails[];
};

export class GetAvailableLicensesAction {
    constructor() {}

    async getAvailableLicenses(
        params: GetAvailableLicensesParams
    ): Promise<GetAvailableLicensesResponse> {
        const ipLicenseTermsQueryOptions = {
            pagination: {
                limit: 10,
                offset: 0,
            },
            orderBy: "blockNumber",
            orderDirection: "desc",
        };

        elizaLogger.log(
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
                    ip_ids: [params.ipid], // Use the provided IPID instead of hardcoded value
                    options: ipLicenseTermsQueryOptions, // Use the defined query options
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        try {
            const licenseDetailsResponse = JSON.parse(text);
            elizaLogger.log("licenseDetailsResponse", licenseDetailsResponse);
            return licenseDetailsResponse;
        } catch (e) {
            elizaLogger.error("Failed to parse response:", text);
            throw new Error(`Failed to parse JSON response: ${e.message}`);
        }
    }
}

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
        elizaLogger.log("Starting GET_AVAILABLE_LICENSES handler...");

        // initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const getAvailableLicensesContext = composeContext({
            state,
            template: getAvailableLicensesTemplate,
        });

        const content = await generateObjectDEPRECATED({
            runtime,
            context: getAvailableLicensesContext,
            modelClass: ModelClass.SMALL,
        });

        const action = new GetAvailableLicensesAction();
        try {
            const response = await action.getAvailableLicenses(content);

            // TODO: need to format this better into human understandable terms
            const formattedResponse = response.data
                .map((license) => {
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
                })
                .join("\n");

            callback?.({
                text: formattedResponse,
                action: "GET_AVAILABLE_LICENSES",
                source: "Story Protocol API",
            });
            return true;
        } catch (e) {
            elizaLogger.error("Error fetching available licenses:", e.message);
            callback?.({
                text: `Error fetching available licenses: ${e.message}`,
            });
            return false;
        }
    },
    template: getAvailableLicensesTemplate,
    validate: async (runtime: IAgentRuntime) => {
        return true;
    },
    examples: [
        [
            {
                user: "assistant",
                content: {
                    text: "Getting available licenses for an IP Asset 0x2265F2b8e47F98b3Bdf7a1937EAc27282954A4Db",
                    action: "GET_AVAILABLE_LICENSES",
                },
            },
            {
                user: "user",
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
