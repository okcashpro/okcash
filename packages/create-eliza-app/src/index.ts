#!/usr/bin/env node

import { downloadTemplate } from "giget";
import { runMain } from "citty";

const DEFAULT_TEMPLATE = "eliza";
const DEFAULT_REGISTRY =
    "https://raw.githubusercontent.com/ai16z/eliza/main/packages/create-eliza-app/registry";

runMain({
    args: {
        name: {
            type: "string",
            description: "Name of the template to use",
            required: false,
        },
        registry: {
            type: "string",
            description: "Registry URL to download the template from",
            default: DEFAULT_REGISTRY,
        },
        dir: {
            type: "string",
            description: "Directory where the project will be created",
            required: false,
        },
        _dir: {
            type: "positional",
            default: ".",
            description: "Project directory (prefer using --dir)",
        },
    },
    async run(context) {
        try {
            const templateName = context.args.name || DEFAULT_TEMPLATE;
            const targetDir = context.args.dir || context.args._dir;

            console.log(`Downloading template ${templateName}...`);

            const res = await downloadTemplate(templateName, {
                registry: context.args.registry,
                dir: targetDir,
            });

            console.log(`Downloaded template to ${res.dir} from ${res.source}`);

            // Print getting started instructions if using default template
            if (templateName === DEFAULT_TEMPLATE) {
                console.log("\nGetting Started:");
                console.log(`  cd ${res.dir}`);
                console.log("  cp .env.example .env");
                console.log("  pnpm install");
                console.log("  pnpm start");
            }
        } catch (error: any) {
            console.error(
                "Error:",
                "message" in error ? error.message : "unknown error"
            );
            process.exit(1);
        }
    },
});
