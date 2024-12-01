import eslintGlobalConfig from "../../eslint.config.mjs";

export default [
    ...eslintGlobalConfig,
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    },
];
