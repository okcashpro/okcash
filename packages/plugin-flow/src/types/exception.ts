export default class Exception extends Error {
    constructor(
        readonly code: number,
        message?: string,
        options?: ErrorOptions
    ) {
        super(message, options);
    }
}
