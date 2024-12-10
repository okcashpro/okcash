export type Option<T> = [] | [T];

// Unwrap
export const unwrapOption = <T>(v: [] | [T]): T | undefined =>
    v.length ? v[0] : undefined;
// Unwrap and map
export const unwrapOptionMap = <T, R>(
    v: [] | [T],
    map: (t: T) => R
): R | undefined => (v.length ? map(v[0]) : undefined);

// Wrap
export const wrapOption = <T>(v?: T): [] | [T] => (v !== undefined ? [v] : []);
// Wrap and map
export const wrapOptionMap = <T, R>(
    v: T | undefined,
    map: (t: T) => R
): [] | [R] => (v !== undefined ? [map(v)] : []);
