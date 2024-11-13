# Secrets Management

## Overview

Eliza provides multiple options for managing secrets and credentials, including environment variables and character-specific secrets. This guide covers best practices for managing API keys, tokens, and other sensitive configuration values across different deployment scenarios.

## Environment Variables

### Basic Setup

Create a `.env` file in your project root:

```bash
# Core API Keys
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=your-key
ELEVENLABS_XI_API_KEY=your-key

# Discord Configuration
DISCORD_APPLICATION_ID=your-app-id
DISCORD_API_TOKEN=your-bot-token

# Twitter Configuration
TWITTER_USERNAME=your-username
TWITTER_PASSWORD=your-password
TWITTER_EMAIL=your-email
TWITTER_COOKIES=your-cookies

# Database Configuration (Optional)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_API_KEY=your-service-key

# Voice Settings (Optional)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_VOICE_STABILITY=0.5
ELEVENLABS_VOICE_SIMILARITY_BOOST=0.9
ELEVENLABS_VOICE_STYLE=0.66
ELEVENLABS_VOICE_USE_SPEAKER_BOOST=false
ELEVENLABS_OPTIMIZE_STREAMING_LATENCY=4
ELEVENLABS_OUTPUT_FORMAT=pcm_16000
```

## Character-Specific Secrets

### Configuration in Character Files

Character files can include their own secrets, which override environment variables:

```json
{
  "name": "AgentName",
  "clients": ["discord", "twitter"],
  "modelProvider": "openai",
  "settings": {
    "secrets": {
      "OPENAI_API_KEY": "character-specific-key",
      "DISCORD_TOKEN": "bot-specific-token",
      "TWITTER_USERNAME": "bot-twitter-handle",
      "TWITTER_PASSWORD": "bot-twitter-password"
    }
  }
}
```

### Precedence Order

Secrets are resolved in the following order:

1. Character-specific secrets (highest priority)
2. Environment variables
3. Default values (lowest priority)

## Best Practices

### 1. Secret Storage

- Never commit secret files to version control
- Use `.gitignore` to exclude sensitive files:

```bash
# .gitignore
.env
.env.*
characters/**/secrets.json
**/serviceAccount.json
```

### 2. Development Workflow

Create different environment files for different environments:

```bash
.env.development    # Local development settings
.env.staging       # Staging environment
.env.production    # Production settings
```

### 3. Secret Rotation

Implement a rotation strategy:

```typescript
class SecretManager {
  private static readonly SECRET_LIFETIME = 90 * 24 * 60 * 60 * 1000; // 90 days

  async shouldRotateSecret(secretName: string): Promise<boolean> {
    const lastRotation = await this.getLastRotation(secretName);
    return Date.now() - lastRotation > SecretManager.SECRET_LIFETIME;
  }
}
```

### 4. Secure Character Files

When using character-specific secrets:

```typescript
// Validate character file location
const isSecurePath = (path: string): boolean => {
  return !path.includes("../") && !path.startsWith("/");
};

// Load character securely
const loadCharacter = async (path: string) => {
  if (!isSecurePath(path)) {
    throw new Error("Invalid character file path");
  }
  // Load and validate character
};
```

## Security Considerations

### 1. Access Control

Implement proper access controls for secret management:

```typescript
class SecretAccess {
  private static readonly ALLOWED_KEYS = [
    "OPENAI_API_KEY",
    "DISCORD_TOKEN",
    // ... other allowed keys
  ];

  static validateAccess(key: string): boolean {
    return this.ALLOWED_KEYS.includes(key);
  }
}
```

### 2. Encryption at Rest

For stored secrets:

```typescript
import { createCipheriv, createDecipheriv } from "crypto";

class SecretEncryption {
  static async encrypt(value: string, key: Buffer): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    // ... implementation
  }

  static async decrypt(encrypted: string, key: Buffer): Promise<string> {
    // ... implementation
  }
}
```

### 3. Secret Validation

Validate secrets before use:

```typescript
async function validateSecrets(character: Character): Promise<void> {
  const required = ["OPENAI_API_KEY"];
  const missing = required.filter((key) => !character.settings.secrets[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(", ")}`);
  }
}
```

## Troubleshooting

### Common Issues

1. **Missing Secrets**

```typescript
if (!process.env.OPENAI_API_KEY && !character.settings.secrets.OPENAI_API_KEY) {
  throw new Error(
    "OpenAI API key not found in environment or character settings",
  );
}
```

2. **Invalid Secret Format**

```typescript
function validateApiKey(key: string): boolean {
  // OpenAI keys start with 'sk-'
  if (key.startsWith("sk-")) {
    return key.length > 20;
  }
  return false;
}
```

3. **Secret Loading Errors**

```typescript
try {
  await loadSecrets();
} catch (error) {
  if (error.code === "ENOENT") {
    console.error("Environment file not found");
  } else if (error instanceof ValidationError) {
    console.error("Invalid secret format");
  }
}
```

## Related Resources

- [Configuration Guide](./configuration.md) for general configuration options
- [Character Files](../core/characterfile.md) for character-specific settings
- [Local Development](./local-development.md) for development environment setup

Remember to follow security best practices and never expose sensitive credentials in logs, error messages, or version control systems.
