import { jest } from "@jest/globals";
import type { Mocked } from "jest-mock";
import { config } from "dotenv";
import { resolve } from "path";
import { WebClient } from "@slack/web-api";
import type {
    AuthTestResponse,
    ChatPostMessageResponse,
    ConversationsInfoResponse,
    FilesUploadResponse,
} from "@slack/web-api";

// Load test environment variables
const envPath = resolve(__dirname, "../../../../.env");
console.log("Loading test environment from:", envPath);
config({ path: envPath });

// Set up test environment variables if not present
const testEnvVars = {
    SLACK_APP_ID: "test-app-id",
    SLACK_CLIENT_ID: "test-client-id",
    SLACK_CLIENT_SECRET: "test-client-secret",
    SLACK_SIGNING_SECRET: "test-signing-secret",
    SLACK_VERIFICATION_TOKEN: "test-verification-token",
    SLACK_BOT_TOKEN: "test-bot-token",
    SLACK_CHANNEL_ID: "test-channel-id",
    SLACK_BOT_ID: "test-bot-id",
};

Object.entries(testEnvVars).forEach(([key, value]) => {
    if (!process.env[key]) {
        process.env[key] = value;
    }
});

// Create base mock functions with proper return types
const mockAuthTest = jest
    .fn<() => Promise<AuthTestResponse>>()
    .mockResolvedValue({
        ok: true,
        url: "https://test.slack.com",
        team: "test-team",
        user: "test-user",
        team_id: "T123456",
        user_id: "U123456",
    });

const mockPostMessage = jest
    .fn<() => Promise<ChatPostMessageResponse>>()
    .mockResolvedValue({
        ok: true,
        channel: "C123456",
        ts: "1234567890.123456",
        message: {
            text: "test message",
            ts: "1234567890.123456",
            type: "message",
        },
    });

const mockConversationsInfo = jest
    .fn<() => Promise<ConversationsInfoResponse>>()
    .mockResolvedValue({
        ok: true,
        channel: {
            id: "C123456",
            name: "test-channel",
            is_channel: true,
            created: 12345678,
        },
    });

const mockFilesUpload = jest
    .fn<() => Promise<FilesUploadResponse>>()
    .mockResolvedValue({
        ok: true,
        file: {
            id: "F123456",
            name: "test-file",
            title: "test-file",
            mimetype: "text/plain",
            filetype: "text",
            pretty_type: "Plain Text",
            user: "U123456",
            size: 12345,
            mode: "hosted",
            is_external: false,
            external_type: "",
            is_public: true,
            public_url_shared: false,
            display_as_bot: false,
            username: "",
            url_private: "https://test.slack.com/files/test-file",
            url_private_download:
                "https://test.slack.com/files/test-file/download",
            permalink: "https://test.slack.com/files/test-file/permalink",
            permalink_public: "https://test.slack.com/files/test-file/public",
            created: 12345678,
            timestamp: 12345678,
            channels: ["C123456"],
            groups: [],
            ims: [],
            comments_count: 0,
        },
    });

const mockFilesUploadV2 = jest
    .fn<() => Promise<FilesUploadResponse>>()
    .mockResolvedValue({
        ok: true,
        file: {
            id: "F123456",
            created: 12345678,
            timestamp: 12345678,
            name: "test-file",
            title: "test-file",
            mimetype: "text/plain",
            filetype: "text",
            pretty_type: "Plain Text",
            user: "U123456",
            size: 12345,
            mode: "hosted",
            is_external: false,
            external_type: "",
            is_public: true,
            public_url_shared: false,
            display_as_bot: false,
            username: "",
            url_private: "https://test.slack.com/files/test-file",
            url_private_download:
                "https://test.slack.com/files/test-file/download",
            permalink: "https://test.slack.com/files/test-file/permalink",
            permalink_public: "https://test.slack.com/files/test-file/public",
            channels: ["C123456"],
            groups: [],
            ims: [],
            comments_count: 0,
        },
    });

// Create mock WebClient
const mockWebClient = {
    slackApiUrl: "https://slack.com/api/",
    token: "test-token",
    apiCall: jest.fn(),
    auth: {
        test: mockAuthTest,
    },
    chat: {
        postMessage: mockPostMessage,
    },
    conversations: {
        info: mockConversationsInfo,
    },
    files: {
        upload: mockFilesUpload,
        uploadV2: mockFilesUploadV2,
    },
} as unknown as Mocked<WebClient>;

// Mock the WebClient constructor
jest.mock("@slack/web-api", () => ({
    WebClient: jest.fn().mockImplementation(() => mockWebClient),
}));

// Helper function to get mock WebClient
export function getMockWebClient(): Mocked<WebClient> {
    return mockWebClient;
}

// Helper function to create mock Slack API responses
export function createMockSlackResponse(ok: boolean, data: any = {}) {
    return {
        ok,
        ...data,
    };
}

// Helper function to simulate rate limiting
export function simulateRateLimit(client: Mocked<WebClient>) {
    const mockPostMessage = client.chat.postMessage as Mocked<
        typeof client.chat.postMessage
    >;
    mockPostMessage.mockRejectedValueOnce(new Error("rate_limited"));
}

// Helper function to simulate network errors
export function simulateNetworkError(client: Mocked<WebClient>) {
    const mockPostMessage = client.chat.postMessage as Mocked<
        typeof client.chat.postMessage
    >;
    mockPostMessage.mockRejectedValueOnce(new Error("network_error"));
}

// Global test setup
beforeAll(() => {
    jest.clearAllMocks();
});

// Reset mocks after each test
afterEach(() => {
    jest.clearAllMocks();
});
