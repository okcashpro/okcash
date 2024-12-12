// bigint -> string
export const bigint2string = (n: bigint): string => `${n}`;

// string -> bigint
export const string2bigint = (n: string): bigint => BigInt(n);
