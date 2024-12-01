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
