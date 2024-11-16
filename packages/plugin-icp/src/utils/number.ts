// Define an array of units for abbreviating large numbers
const units: string[] = ["k", "m", "b", "t"];

/**
 * Convert a number to a string with specified precision
 * @param number The number to format
 * @param precision Number of decimal places, defaults to 1
 * @returns Formatted string
 */
export function toPrecision(number: number, precision = 1): string {
    return (
        number
            .toString()
            // Keep specified number of decimal places
            .replace(new RegExp(`(.+\\.\\d{${precision}})\\d+`), "$1")
            // Remove trailing zeros but keep at least one decimal place
            .replace(/(\.[1-9]*)0+$/, "$1")
            // Remove decimal point if no digits follow
            .replace(/\.$/, "")
    );
}

/**
 * Abbreviate a number
 * @param number The number to abbreviate
 * @returns Formatted number string
 */
export function abbreviateNumber(number: number): string {
    const isNegative = number < 0;
    const absNumber = Math.abs(number);

    // For absolute values less than 1, keep 3 decimal places
    if (absNumber < 1)
        return (isNegative ? "-" : "") + toPrecision(absNumber, 3);
    // For absolute values less than 100, keep 2 decimal places
    if (absNumber < 10 ** 2)
        return (isNegative ? "-" : "") + toPrecision(absNumber, 2);
    // For absolute values less than 10000, use thousands separator and keep 1 decimal place
    if (absNumber < 10 ** 4) {
        const formatted = new Intl.NumberFormat().format(
            Number.parseFloat(toPrecision(absNumber, 1))
        );
        return isNegative ? `-${formatted}` : formatted;
    }

    const decimalsDivisor = 10 ** 1;
    let result: string = String(absNumber);

    // Iterate through units array to find appropriate abbreviation
    for (let i = units.length - 1; i >= 0; i--) {
        const size = 10 ** ((i + 1) * 3);
        if (size <= absNumber) {
            // Calculate abbreviated value
            const abbreviatedNumber =
                (absNumber * decimalsDivisor) / size / decimalsDivisor;
            // Format number and add unit
            result = toPrecision(abbreviatedNumber, 1) + units[i];
            break;
        }
    }

    return isNegative ? `-${result}` : result;
}
