import { getCrc32 } from "@dfinity/principal/lib/esm/utils/getCrc";
import { sha224 } from "@dfinity/principal/lib/esm/utils/sha224";

import { Principal } from "@dfinity/principal";
import { array2hex, hex2array, string2array } from "../arrays";

// Principal -> string
export const principal2string = (p: Principal): string => p.toText();

// string -> Principal
export const string2principal = (p: string): Principal => Principal.fromText(p);

// Calculate account from Principal
export const principal2account = (
    principal: string,
    subaccount?: number | Uint8Array | number[]
): string => {
    return array2hex(principal2account_array(principal, subaccount));
};

// Calculate subAccount from Principal
export const principal2SubAccount = (principal: string): Uint8Array => {
    const bytes = string2principal(principal).toUint8Array();
    const subAccount = new Uint8Array(32);
    subAccount[0] = bytes.length;
    subAccount.set(bytes, 1);
    return subAccount;
};

// Calculate account from Principal
export const principal2account_array = (
    principal: string,
    subaccount?: number | Uint8Array | number[]
): number[] => {
    let subaccountArray: number[];
    if (typeof subaccount === "number") {
        subaccountArray = [
            (subaccount >> 24) & 0xff,
            (subaccount >> 16) & 0xff,
            (subaccount >> 8) & 0xff,
            subaccount & 0xff,
        ];
    }
    if (subaccount === undefined) {
        subaccountArray = [];
    } else if (Array.isArray(subaccount)) {
        subaccountArray = [...subaccount];
    } else if (subaccount instanceof Uint8Array) {
        subaccountArray = Array.from(subaccount);
    } else {
        throw new Error(`Invalid subaccount type: ${typeof subaccount}`);
    }

    while (subaccountArray.length < 32) {
        subaccountArray.unshift(0);
    }
    if (subaccountArray.length !== 32) {
        throw new Error(`Wrong subaccount length: ${subaccountArray.length}`);
    }

    const buffer: number[] = [
        ...string2array("\x0Aaccount-id"),
        ...Array.from(string2principal(principal).toUint8Array()),
        ...subaccountArray,
    ];

    const hash = sha224(new Uint8Array(buffer));
    const checksum = getCrc32(hash);

    const result = [
        (checksum >> 24) & 0xff,
        (checksum >> 16) & 0xff,
        (checksum >> 8) & 0xff,
        (checksum >> 0) & 0xff,
        ...Array.from(hash),
    ];

    return result;
};

// Check if it's a valid account
export const isAccountHex = (text: string | undefined): boolean => {
    if (!text) return false;
    if (text.length !== 64) return false;
    try {
        return hex2array(text).length === 32;
    } catch {
        // Ignore error
    }
    return false;
};
