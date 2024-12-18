import { config } from "dotenv";
import { SlackClientProvider } from "../providers/slack-client.provider";
import { AttachmentManager } from "../attachments";
import { SlackConfig } from "../types/slack-types";
import path from "path";

// Load environment variables
config({ path: path.resolve(__dirname, "../../../.env") });

console.log("\n=== Starting Slack Attachment Example ===\n");

// Load environment variables
const slackConfig: SlackConfig = {
    appId: process.env.SLACK_APP_ID || "",
    clientId: process.env.SLACK_CLIENT_ID || "",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "",
    signingSecret: process.env.SLACK_SIGNING_SECRET || "",
    verificationToken: process.env.SLACK_VERIFICATION_TOKEN || "",
    botToken: process.env.SLACK_BOT_TOKEN || "",
    botId: process.env.SLACK_BOT_ID || "",
};

console.log("Environment variables loaded:");
Object.entries(slackConfig).forEach(([key, value]) => {
    if (value) {
        console.log(`${key}: ${value.slice(0, 4)}...${value.slice(-4)}`);
    } else {
        console.error(`Missing ${key}`);
    }
});

async function runExample() {
    try {
        console.log("\nInitializing Slack client...");
        const provider = new SlackClientProvider(slackConfig);
        const client = provider.getContext().client;

        console.log("\nValidating Slack connection...");
        const isValid = await provider.validateConnection();
        if (!isValid) {
            throw new Error("Failed to validate Slack connection");
        }
        console.log("✓ Successfully connected to Slack");

        // Test file upload
        const channelId = process.env.SLACK_CHANNEL_ID;
        if (!channelId) {
            throw new Error("SLACK_CHANNEL_ID is required");
        }

        console.log("\nSending test message with attachment...");
        const testMessage = "Here is a test message with an attachment";

        // Create a test file
        const testFilePath = path.join(__dirname, "test.txt");
        async function loadFs() {
            return await import("fs");
        }
        const fs = await loadFs();
        fs.writeFileSync(
            testFilePath,
            "This is a test file content for attachment testing."
        );

        // Upload the file
        const fileUpload = await client.files.upload({
            channels: channelId,
            file: fs.createReadStream(testFilePath),
            filename: "test.txt",
            title: "Test Attachment",
            initial_comment: testMessage,
        });

        console.log("✓ File uploaded successfully");

        // Initialize AttachmentManager
        const runtime = {
            getSetting: (key: string) => process.env[key],
            getService: () => null,
            // Add other required runtime properties as needed
        };
        const attachmentManager = new AttachmentManager(runtime as any, client);

        // Process the uploaded file
        if (fileUpload.file) {
            console.log("\nProcessing attachment...");
            const processedAttachment =
                await attachmentManager.processAttachment({
                    id: fileUpload.file.id,
                    url_private: fileUpload.file.url_private || "",
                    name: fileUpload.file.name || "",
                    size: fileUpload.file.size || 0,
                    mimetype: fileUpload.file.mimetype || "text/plain",
                    title: fileUpload.file.title || "",
                });

            console.log("✓ Attachment processed:", processedAttachment);
        }

        // Cleanup
        fs.unlinkSync(testFilePath);
        console.log("\n✓ Test completed successfully");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

runExample().then(() => {
    console.log("\n=== Example completed ===\n");
    process.exit(0);
});
