import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import typescript from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin"; // Add Vitest plugin

export default [
    // JavaScript and TypeScript files
    {
        files: ["src/**/*.js", "src/**/*.cjs", "src/**/*.mjs", "src/**/*.ts"],
        languageOptions: {
            parser: typescript,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                project: "./tsconfig.json", // Make sure your tsconfig includes @types/node
            },
            globals: {
                // Add Node.js globals
                NodeJS: "readonly",
                console: "readonly",
                process: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                module: "readonly",
                require: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            ...eslint.configs.recommended.rules,
            ...tseslint.configs.recommended.rules,
            "prefer-const": "warn",
            "no-constant-binary-expression": "error",

            // Disable no-undef as TypeScript handles this better
            "no-undef": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            // Customize TypeScript rules
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
        },
    },
    // Vitest configuration
    {
        files: [
            "src/**/*.test.js",
            "src/**/*.test.ts",
            "src/**/*.spec.js",
            "src/**/*.spec.ts",
        ],
        plugins: {
            vitest, // Register Vitest plugin
        },
        rules: {
            ...vitest.configs.recommended.rules,
        },
    },
    // Add prettier as the last config to override other formatting rules
    prettier,
];
