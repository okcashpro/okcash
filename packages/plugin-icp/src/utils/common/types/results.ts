import { customStringify } from "../data/json";

// Motoko result object
export type MotokoResult<T, E> =
    | { ok: T; err?: undefined }
    | { ok?: undefined; err: E };

// Rust result object
export type RustResult<T, E> =
    | { Ok: T; Err?: undefined }
    | { Ok?: undefined; Err: E };

// ================ motoko ================

// Map values
export const parseMotokoResult = <Ok, Err, T, E>(
    result: MotokoResult<Ok, Err>,
    transform_ok: (t: Ok) => T,
    transform_err: (e: Err) => E
): MotokoResult<T, E> => {
    if (result.ok !== undefined) return { ok: transform_ok(result.ok) };
    if (result.err !== undefined) return { err: transform_err(result.err) };
    throw new Error(`wrong motoko result: ${customStringify(result)}`);
};

// Unwrap
export const unwrapMotokoResult = <T, E>(
    result: MotokoResult<T, E>,
    handle_error: (e: E) => T
): T => {
    if (result.ok !== undefined) return result.ok;
    if (result.err !== undefined) return handle_error(result.err);
    throw new Error(`wrong motoko result: ${customStringify(result)}`);
};

// Unwrap and map
export const unwrapMotokoResultMap = <O, E, T>(
    result: MotokoResult<O, E>,
    transform_ok: (o: O) => T,
    transform_err: (e: E) => T
): T => {
    if (result.ok !== undefined) return transform_ok(result.ok);
    if (result.err !== undefined) return transform_err(result.err);
    throw new Error(`wrong motoko result: ${customStringify(result)}`);
};

// ================ rust ================

export const parseRustResult = <Ok, Err, T, E>(
    result: RustResult<Ok, Err>,
    transform_ok: (t: Ok) => T,
    transform_err: (e: Err) => E
): RustResult<T, E> => {
    if (result.Ok !== undefined) return { Ok: transform_ok(result.Ok) };
    if (result.Err !== undefined) return { Err: transform_err(result.Err) };
    throw new Error(`wrong rust result: ${customStringify(result)}`);
};

// Unwrap
export const unwrapRustResult = <T, E>(
    result: RustResult<T, E>,
    handle_error: (e: E) => T
): T => {
    if (result.Ok !== undefined) return result.Ok;
    if (result.Err !== undefined) return handle_error(result.Err);
    throw new Error(`wrong rust result: ${customStringify(result)}`);
};

// Unwrap and map
export const unwrapRustResultMap = <O, E, T>(
    result: RustResult<O, E>,
    transform_ok: (o: O) => T,
    transform_err: (e: E) => T
): T => {
    if (result.Ok !== undefined) return transform_ok(result.Ok);
    if (result.Err !== undefined) return transform_err(result.Err);
    throw new Error(`wrong rust result: ${customStringify(result)}`);
};
