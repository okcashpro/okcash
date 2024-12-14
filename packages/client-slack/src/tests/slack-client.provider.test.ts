import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import type { Mocked } from 'jest-mock';
import { SlackClientProvider } from '../providers/slack-client.provider';
import { SlackConfig } from '../types/slack-types';
import { getMockWebClient, createMockSlackResponse } from './setup';
import { WebClient } from '@slack/web-api';
import type { AuthTestResponse, ChatPostMessageResponse, ConversationsInfoResponse } from '@slack/web-api';

jest.mock('@slack/web-api');

describe('SlackClientProvider', () => {
  let provider: SlackClientProvider;
  let mockWebClient: Mocked<WebClient>;
  let mockConfig: SlackConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = {
      appId: 'test-app-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      signingSecret: 'test-signing-secret',
      verificationToken: 'test-verification-token',
      botToken: 'test-bot-token',
      botId: 'test-bot-id'
    };
    mockWebClient = getMockWebClient();
    provider = new SlackClientProvider(mockConfig);
  });

  describe('Initialization', () => {
    test('should create a provider instance with default retry options', () => {
      expect(provider).toBeInstanceOf(SlackClientProvider);
      const context = provider.getContext();
      expect(context).toHaveProperty('client');
      expect(context).toHaveProperty('config');
      expect(context.config).toEqual(mockConfig);
    });

    test('should create a provider instance with custom retry options', () => {
      const retryOptions = {
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 10000,
      };
      const providerWithOptions = new SlackClientProvider(mockConfig, retryOptions);
      expect(providerWithOptions).toBeInstanceOf(SlackClientProvider);
    });
  });

  describe('Connection Validation', () => {
    test('should successfully validate connection', async () => {
      const mockResponse = createMockSlackResponse(true, { user_id: 'test-bot-id' }) as AuthTestResponse;
      const mockTest = mockWebClient.auth.test as Mocked<typeof mockWebClient.auth.test>;
      mockTest.mockResolvedValue(mockResponse);

      const result = await provider.validateConnection();
      expect(result).toBe(true);
      expect(mockTest).toHaveBeenCalled();
    });

    test('should handle failed connection validation', async () => {
      const mockResponse = createMockSlackResponse(false) as AuthTestResponse;
      const mockTest = mockWebClient.auth.test as Mocked<typeof mockWebClient.auth.test>;
      mockTest.mockResolvedValue(mockResponse);

      const result = await provider.validateConnection();
      expect(result).toBe(false);
    });

    test('should handle connection errors', async () => {
      const mockTest = mockWebClient.auth.test as Mocked<typeof mockWebClient.auth.test>;
      mockTest.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.validateConnection();
      expect(result).toBe(false);
    });
  });

  describe('Message Sending', () => {
    const channelId = 'test-channel';
    const text = 'Hello, world!';

    test('should successfully send a message', async () => {
      const expectedResponse = createMockSlackResponse(true, { ts: '1234567890.123456' }) as ChatPostMessageResponse;
      const mockPostMessage = mockWebClient.chat.postMessage as Mocked<typeof mockWebClient.chat.postMessage>;
      mockPostMessage.mockResolvedValue(expectedResponse);
      
      const result = await provider.sendMessage(channelId, text);
      expect(result).toEqual(expectedResponse);
      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: channelId,
        text
      });
    });

    test('should handle rate limiting', async () => {
      const mockResponse = createMockSlackResponse(true) as ChatPostMessageResponse;
      const mockPostMessage = mockWebClient.chat.postMessage as Mocked<typeof mockWebClient.chat.postMessage>;
      
      mockPostMessage
        .mockRejectedValueOnce(new Error('rate_limited'))
        .mockResolvedValueOnce(mockResponse);
      
      const result = await provider.sendMessage(channelId, text);
      expect(result.ok).toBe(true);
      expect(mockPostMessage).toHaveBeenCalledTimes(2);
    });

    test('should handle network errors', async () => {
      const mockResponse = createMockSlackResponse(true) as ChatPostMessageResponse;
      const mockPostMessage = mockWebClient.chat.postMessage as Mocked<typeof mockWebClient.chat.postMessage>;
      
      mockPostMessage
        .mockRejectedValueOnce(new Error('network_error'))
        .mockResolvedValueOnce(mockResponse);
      
      const result = await provider.sendMessage(channelId, text);
      expect(result.ok).toBe(true);
      expect(mockPostMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('Thread Replies', () => {
    const channelId = 'test-channel';
    const threadTs = '1234567890.123456';
    const text = 'Thread reply';

    test('should successfully reply in thread', async () => {
      const expectedResponse = createMockSlackResponse(true, { ts: '1234567890.123457' }) as ChatPostMessageResponse;
      const mockPostMessage = mockWebClient.chat.postMessage as Mocked<typeof mockWebClient.chat.postMessage>;
      mockPostMessage.mockResolvedValue(expectedResponse);
      
      const result = await provider.replyInThread(channelId, threadTs, text);
      expect(result).toEqual(expectedResponse);
      expect(mockPostMessage).toHaveBeenCalledWith({
        channel: channelId,
        text,
        thread_ts: threadTs
      });
    });
  });

  describe('Channel Validation', () => {
    const channelId = 'test-channel';

    test('should successfully validate channel', async () => {
      const mockResponse = createMockSlackResponse(true) as ConversationsInfoResponse;
      const mockInfo = mockWebClient.conversations.info as Mocked<typeof mockWebClient.conversations.info>;
      mockInfo.mockResolvedValue(mockResponse);

      const result = await provider.validateChannel(channelId);
      expect(result).toBe(true);
    });

    test('should handle invalid channel', async () => {
      const mockInfo = mockWebClient.conversations.info as Mocked<typeof mockWebClient.conversations.info>;
      mockInfo.mockRejectedValue(new Error('Channel not found'));

      const result = await provider.validateChannel(channelId);
      expect(result).toBe(false);
    });
  });
});