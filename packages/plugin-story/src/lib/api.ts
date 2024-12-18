import {
    IPLicenseTerms,
    PILTerms,
    QUERY_ORDER_BY,
    QUERY_ORDER_DIRECTION,
    QueryOptions,
    RESOURCE_TYPE,
    ResourceType,
    Trait,
} from "../types/api";
import { okaiLogger } from "@okcashpro/okai";

import { camelize } from "./utils";
const API_BASE_URL = process.env.STORY_API_BASE_URL;
const API_VERSION = "v2";
export const API_URL = `${API_BASE_URL}/${API_VERSION}`;
export const API_KEY = process.env.STORY_API_KEY || "";

export async function getResource(
    resourceName: ResourceType,
    resourceId: string,
    options?: QueryOptions
) {
    try {
        okaiLogger.log(
            `Fetching resource ${API_URL}/${resourceName}/${resourceId}`
        );
        const res = await fetch(`${API_URL}/${resourceName}/${resourceId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY as string,
                "x-chain": "1516",
            },
        });
        if (res.ok) {
            okaiLogger.log("Response is ok");
            return res.json();
        } else {
            okaiLogger.log("Response is not ok");
            okaiLogger.log(JSON.stringify(res));
            throw new Error(`HTTP error! status: ${res.status}`);
        }
    } catch (error) {
        console.error(error);
    }
}

export async function listResource(
    resourceName: ResourceType,
    options?: QueryOptions
) {
    try {
        const _options = {
            pagination: {
                limit: 10,
                offset: 0,
            },
            orderBy: QUERY_ORDER_BY.BLOCK_NUMBER,
            orderDirection: QUERY_ORDER_DIRECTION.DESC,
            ...options,
        };
        okaiLogger.log(`Calling Story API ${resourceName}`);
        okaiLogger.log(`STORY_API_KEY: ${API_KEY}`);
        okaiLogger.log(`API_URL: ${API_URL}`);
        okaiLogger.log(`API_VERSION: ${API_VERSION}`);
        okaiLogger.log(`_options: ${JSON.stringify(_options)}`);
        const res = await fetch(`${API_URL}/${resourceName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY as string,
                "x-chain": "1516",
            },
            cache: "no-cache",
            ...(_options && { body: JSON.stringify({ options: _options }) }),
        });
        if (res.ok) {
            okaiLogger.log("Response is ok");
            okaiLogger.log(res.ok);
            return res.json();
        } else {
            okaiLogger.log("Response is not ok");
            okaiLogger.log(res);
            return res;
        }
    } catch (error) {
        okaiLogger.log("List resource Error");
        console.error(error);
    }
}

export async function fetchLicenseTermsDetails(data: IPLicenseTerms[]) {
    const requests = data.map((item) =>
        getResource(RESOURCE_TYPE.LICENSE_TERMS, item.licenseTermsId)
    );
    const results = await Promise.all(requests);

    return results
        .filter((value) => !!value)
        .map((result) => {
            return {
                ...result.data,
                licenseTerms: convertLicenseTermObject(
                    result.data.licenseTerms
                ),
            };
        });
}

type LicenseTerms = Partial<PILTerms>;

export function convertLicenseTermObject(licenseTerms: Trait[]): LicenseTerms {
    return licenseTerms.reduce((acc, option: Trait): LicenseTerms => {
        const key = camelize(option.trait_type) as keyof PILTerms;
        acc[key] =
            option.value === "true"
                ? true
                : option.value === "false"
                  ? false
                  : (option.value as any);
        return acc as LicenseTerms;
    }, {});
}
