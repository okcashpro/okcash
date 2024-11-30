import _ from "lodash";

export const handleShowPrice = (value: number | string, fixed = 8) => {
    if (!value || value === "0") return 0;
    return _.round(Number(value), fixed);
    // return value / 1e18;
};
