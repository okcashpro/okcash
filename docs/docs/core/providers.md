---
sidebar_position: 3
title: Providers
---

# Providers

## Overview

Providers are core modules that inject dynamic context and real-time information into agent interactions. They serve as a bridge between the agent and various external systems, enabling access to market data, wallet information, sentiment analysis, and temporal context.

## Core Provider Types

### 1. Time Provider

Provides temporal context for agent interactions:

```typescript
const timeProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory) => {
    const currentDate = new Date();
    const currentTime = currentDate.toLocaleTimeString("en-US");
    const currentYear = currentDate.getFullYear();
    return `The current time is: ${currentTime}, ${currentYear}`;
  },
};
```

### 2. Token Provider

Provides comprehensive token analytics and market data:

```typescript
interface TokenAnalytics {
  security: TokenSecurityData;
  tradeData: TokenTradeData;
  holderDistribution: string;
  marketMetrics: {
    price: number;
    volume24h: number;
    priceChange: number;
  };
}
```

Key features:

- Real-time price and volume data
- Security metrics and risk assessment
- Holder distribution analysis
- DexScreener integration
- Smart caching system

### 3. Wallet Provider

Manages cryptocurrency wallet interactions:

```typescript
interface WalletPortfolio {
  totalUsd: string;
  totalSol?: string;
  items: Array<{
    name: string;
    symbol: string;
    balance: string;
    valueUsd: string;
    valueSol?: string;
  }>;
}
```

Capabilities:

- Portfolio valuation
- Token balances
- Price tracking
- Performance metrics
- Multi-currency support

### 4. Boredom Provider

Manages conversation dynamics and engagement:

```typescript
interface BoredomLevel {
  minScore: number;
  statusMessages: string[];
}
```

Features:

- Engagement tracking
- Conversation flow management
- Natural disengagement
- Sentiment analysis
- Response adaptation

## Implementation

### Provider Interface

```typescript
interface Provider {
  get: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ) => Promise<string>;
}
```

### Data Caching System

```typescript
class CacheManager {
  private cache: NodeCache;
  private cacheDir: string;

  constructor(ttl: number = 300) {
    // 5 minutes default
    this.cache = new NodeCache({ stdTTL: ttl });
    this.cacheDir = path.join(__dirname, "cache");
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    // Check memory cache
    const memoryCache = this.cache.get<T>(key);
    if (memoryCache) return memoryCache;

    // Check file cache
    return this.readFromFileCache<T>(key);
  }
}
```

### Error Handling

```typescript
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  fallback: T,
  retries: number = 3,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Provider error: ${error.message}`);
    if (retries > 0) {
      await delay(1000);
      return withErrorHandling(operation, fallback, retries - 1);
    }
    return fallback;
  }
}
```

## Provider Configuration

### Base Settings

```typescript
const PROVIDER_CONFIG = {
  API_ENDPOINTS: {
    BIRDEYE: "https://public-api.birdeye.so",
    DEXSCREENER: "https://api.dexscreener.com/latest/dex",
    HELIUS: "https://mainnet.helius-rpc.com",
  },
  CACHE_TTL: 300, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};
```

### Rate Limiting

```typescript
const rateLimiter = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

## Best Practices

### 1. Data Management

- Implement robust caching strategies
- Use appropriate TTL for different data types
- Validate data before caching

### 2. Performance

```typescript
// Example of optimized data fetching
async function fetchDataWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cache.get(key);
  if (cached) return cached;

  const data = await fetcher();
  await cache.set(key, data);
  return data;
}
```

### 3. Error Handling

- Implement retry mechanisms
- Provide fallback values
- Log errors comprehensively
- Handle API timeouts

### 4. Security

- Validate input parameters
- Sanitize returned data
- Implement rate limiting
- Handle sensitive data appropriately

## Integration Examples

### Combining Multiple Providers

```typescript
async function getMarketContext(
  runtime: IAgentRuntime,
  message: Memory,
): Promise<string> {
  const [timeContext, walletInfo, tokenData] = await Promise.all([
    timeProvider.get(runtime, message),
    walletProvider.get(runtime, message),
    tokenProvider.get(runtime, message),
  ]);

  return formatContext({
    time: timeContext,
    wallet: walletInfo,
    token: tokenData,
  });
}
```

### Custom Provider Implementation

```typescript
const marketSentimentProvider: Provider = {
  get: async (runtime: IAgentRuntime, message: Memory) => {
    const sentiment = await analyzeSentiment(message.content);
    const marketMetrics = await getMarketMetrics();

    return formatSentimentResponse(sentiment, marketMetrics);
  },
};
```

## Troubleshooting

### Common Issues and Solutions

1. **Stale Data**

   ```typescript
   // Implement cache invalidation
   const invalidateCache = async (pattern: string) => {
     const keys = await cache.keys(pattern);
     await Promise.all(keys.map((k) => cache.del(k)));
   };
   ```

2. **Rate Limiting**

   ```typescript
   // Implement backoff strategy
   const backoff = async (attempt: number) => {
     const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
     await new Promise((resolve) => setTimeout(resolve, delay));
   };
   ```

3. **API Failures**
   ```typescript
   // Implement fallback data sources
   const getFallbackData = async () => {
     // Attempt alternative data sources
   };
   ```

## Additional Resources
