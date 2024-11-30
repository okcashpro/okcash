import eslintGlobalConfig from "../../eslint.config.mjs";

export default [
    ...eslintGlobalConfig,
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
                project: "./tsconfig.json",
            },
        }
    },
];
