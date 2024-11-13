---
sidebar_position: 1
title: Fine-tuning
---

# Model Selection and Fine-tuning

## Overview

Eliza provides a flexible model selection and configuration system that supports multiple AI providers including OpenAI, Anthropic, Google, and various LLaMA implementations. This guide explains how to configure and fine-tune models for optimal performance in your use case.

## Supported Models

### Available Providers

Eliza supports the following model providers:

- **OpenAI**

  - Small: gpt-4o-mini
  - Medium: gpt-4o
  - Large: gpt-4o
  - Embeddings: text-embedding-3-small

- **Anthropic**

  - Small: claude-3-haiku
  - Medium: claude-3.5-sonnet
  - Large: claude-3-opus

- **Google (Gemini)**

  - Small: gemini-1.5-flash
  - Medium: gemini-1.5-flash
  - Large: gemini-1.5-pro
  - Embeddings: text-embedding-004

- **LLaMA Cloud**

  - Small: meta-llama/Llama-3.2-3B-Instruct-Turbo
  - Medium: meta-llama-3.1-8b-instruct
  - Large: meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo
  - Embeddings: togethercomputer/m2-bert-80M-32k-retrieval

- **LLaMA Local**
  - Various Hermes-3-Llama models optimized for local deployment

## Configuration Options

### Model Settings

Each model provider can be configured with the following parameters:

```typescript
settings: {
    stop: [],                    // Stop sequences for text generation
    maxInputTokens: 128000,      // Maximum input context length
    maxOutputTokens: 8192,       // Maximum response length
    frequency_penalty: 0.0,      // Penalize frequent tokens
    presence_penalty: 0.0,       // Penalize repeated content
    temperature: 0.3,            // Control randomness (0.0-1.0)
}
```

### Model Classes

Models are categorized into four classes:

- `SMALL`: Optimized for speed and cost
- `MEDIUM`: Balanced performance and capability
- `LARGE`: Maximum capability for complex tasks
- `EMBEDDING`: Specialized for text embeddings

## Fine-tuning Guidelines

### 1. Selecting the Right Model Size

Choose your model class based on your requirements:

- **SMALL Models**

  - Best for: Quick responses, simple tasks, cost-effective deployment
  - Example use cases: Basic chat, simple classifications
  - Recommended: `claude-3-haiku` or `gemini-1.5-flash`

- **MEDIUM Models**

  - Best for: General purpose applications, balanced performance
  - Example use cases: Content generation, complex analysis
  - Recommended: `claude-3.5-sonnet` or `meta-llama-3.1-8b-instruct`

- **LARGE Models**
  - Best for: Complex reasoning, specialized tasks
  - Example use cases: Code generation, detailed analysis
  - Recommended: `claude-3-opus` or `Meta-Llama-3.1-405B`

### 2. Optimizing Model Parameters

```typescript
// Example configuration for different use cases
const chatConfig = {
  temperature: 0.7, // More creative responses
  maxOutputTokens: 2048, // Shorter, focused replies
  presence_penalty: 0.6, // Encourage response variety
};

const analysisConfig = {
  temperature: 0.2, // More deterministic responses
  maxOutputTokens: 8192, // Allow detailed analysis
  presence_penalty: 0.0, // Maintain focused analysis
};
```

### 3. Embedding Configuration

Eliza includes a sophisticated embedding system that supports:

- Automatic caching of embeddings
- Provider-specific optimizations
- Fallback to LLaMA service when needed

```typescript
// Example embedding usage
const embedding = await runtime.llamaService.getEmbeddingResponse(input);
```

## Best Practices

1. **Model Selection**

   - Start with SMALL models and upgrade as needed
   - Use MEDIUM models as your default for general tasks
   - Reserve LARGE models for specific, complex requirements

2. **Parameter Tuning**

   - Keep temperature low (0.2-0.4) for consistent outputs
   - Increase temperature (0.6-0.8) for creative tasks
   - Adjust maxOutputTokens based on expected response length

3. **Embedding Optimization**

   - Utilize the caching system for frequently used content
   - Choose provider-specific embedding models for best results
   - Monitor embedding performance and adjust as needed

4. **Cost Optimization**
   - Use SMALL models for development and testing
   - Implement caching strategies for embeddings
   - Monitor token usage across different model classes

## Common Issues and Solutions

1. **Token Length Errors**

   ```typescript
   // Solution: Implement chunking for long inputs
   const chunks = splitIntoChunks(input, model.settings.maxInputTokens);
   ```

2. **Response Quality Issues**

   ```typescript
   // Solution: Adjust temperature and penalties
   const enhancedSettings = {
     ...defaultSettings,
     temperature: 0.4,
     presence_penalty: 0.2,
   };
   ```

3. **Embedding Cache Misses**
   ```typescript
   // Solution: Implement broader similarity thresholds
   const similarityThreshold = 0.85;
   const cachedEmbedding = await findSimilarEmbedding(
     input,
     similarityThreshold,
   );
   ```

## Advanced Configuration

For advanced use cases, you can extend the model configuration:

```typescript
// Custom model configuration
const customConfig = {
  model: {
    [ModelClass.SMALL]: "your-custom-model",
    [ModelClass.MEDIUM]: "your-custom-model",
    [ModelClass.LARGE]: "your-custom-model",
    [ModelClass.EMBEDDING]: "your-custom-embedding-model",
  },
  settings: {
    // Custom settings
    maxInputTokens: 64000,
    temperature: 0.5,
    // Add custom parameters
    custom_param: "value",
  },
};
```

## Additional Resources

- Check the [Model Providers](/docs/core/providers) documentation for more details about specific providers
- See [Configuration Guide](/docs/guides/configuration) for general configuration options
- Visit [Advanced Usage](/docs/guides/advanced) for complex deployment scenarios

Remember to monitor your model's performance and adjust these configurations based on your specific use case and requirements.
