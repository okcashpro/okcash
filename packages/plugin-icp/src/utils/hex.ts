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
