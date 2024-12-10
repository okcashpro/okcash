// number array -> string
export const array2string = (
    buf: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
): string => {
    const decoder = new TextDecoder();
    return decoder.decode(Buffer.from(buf));
};

// string -> number array
// https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
// https://developer.mozilla.org/zh-CN/docs/Web/API/TextEncoder
export const string2array = (text: string): number[] => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
};

// hex text -> number array
export const hex2array = (hex: string): number[] => {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (cleanHex.length === 0) return [];
    if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex text");
    const value: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
        value.push(Number.parseInt(cleanHex.slice(i, i + 2), 16));
    }
    return value;
};

// number array -> hex text
export const array2hex = (value: number[]): string => {
    return value
        .map((v) => {
            if (v < 0 || 255 < v) throw new Error("number must between 0~255");
            return v.toString(16).padStart(2, "0");
        })
        .join("");
};
