# Local Development

## Prerequisites

Before starting local development, ensure you have:

- Node.js 22 or higher installed
- pnpm package manager installed
- Git for version control
- Code editor (VS Code recommended)
- CUDA Toolkit (optional, for GPU acceleration)

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/ai16z/eliza.git
cd eliza

# Install dependencies
pnpm install

# Install optional Sharp package if needed
pnpm install --include=optional sharp
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure essential variables for local development:

```bash
# Minimum required for local testing
OPENAI_API_KEY=sk-*           # Optional, for OpenAI features
X_SERVER_URL=                 # Leave blank for local inference
XAI_API_KEY=                  # Leave blank for local inference
XAI_MODEL=meta-llama/Llama-3.1-7b-instruct  # Choose your model
```

### 3. Local Model Setup

For local inference without API dependencies:

```bash
# Install CUDA support if you have an NVIDIA GPU
npx --no node-llama-cpp source download --gpu cuda

# The system will automatically download the selected model
# from Hugging Face on first run
```

## Development Workflow

### 1. Running the Development Server

```bash
# Start with default character
pnpm run dev

# Start with specific character(s)
pnpm run dev --characters="characters/your-character.json"

# Start with multiple characters
pnpm run dev --characters="characters/char1.json,characters/char2.json"
```

### 2. Testing in Shell Mode

Open a new terminal to interact with your agent:

```bash
pnpm run shell
```

### 3. Custom Actions Development

Create custom actions without modifying core files:

```bash
# Create custom actions directory
mkdir custom_actions

# Create your action file
touch custom_actions/myAction.ts
```

Register your action in `elizaConfig.yaml`:

```yaml
actions:
  - name: myAction
    path: ./custom_actions/myAction.ts
```

## Database Options

### SQLite (Recommended for Development)

```typescript
import { SqliteDatabaseAdapter } from "@your-org/agent-framework/adapters";
import Database from "better-sqlite3";

const db = new SqliteDatabaseAdapter(new Database("./dev.db"));
```

### In-Memory Database (for Testing)

```typescript
import { SqlJsDatabaseAdapter } from "@your-org/agent-framework/adapters";

const db = new SqlJsDatabaseAdapter(new Database(":memory:"));
```

## GPU Acceleration

For NVIDIA GPU users:

1. Install CUDA Toolkit with cuDNN and cuBLAS
2. Set environment variables:

```bash
CUDA_PATH=/usr/local/cuda  # Windows: typically C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.0
```

## Debugging Tips

### 1. Enable Debug Logging

```bash
# Add to your .env file
DEBUG=eliza:*
```

### 2. VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Eliza",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "DEBUG": "eliza:*"
      }
    }
  ]
}
```

### 3. Common Issues

**Memory Issues:**

```bash
# Increase Node.js memory limit if needed
NODE_OPTIONS="--max-old-space-size=8192" pnpm run dev
```

**Model Download Issues:**

```bash
# Clear model cache
rm -rf ./models/*
# Restart with fresh download
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test tests/your-test.test.ts

# Run with coverage
pnpm test:coverage
```

### Integration Testing

```bash
# Start test environment
pnpm run dev:test

# Run integration tests
pnpm test:integration
```

## Development Best Practices

1. **Version Control**

   - Create feature branches
   - Follow conventional commits
   - Keep PRs focused and manageable

2. **Code Organization**

   - Place custom actions in `custom_actions/`
   - Keep character files in `characters/`
   - Store test data in `tests/fixtures/`

3. **Performance**

   - Use SQLite for development
   - Enable GPU acceleration when possible
   - Monitor memory usage

4. **Testing**
   - Write unit tests for new features
   - Test with multiple model providers
   - Verify character behavior in shell

## Additional Tools

### Character Development

```bash
# Generate character from Twitter data
npx tweets2character

# Convert documents to knowledge base
npx folder2knowledge <path/to/folder>

# Add knowledge to character
npx knowledge2character <character-file> <knowledge-file>
```

Remember to regularly update dependencies and test your changes across different environments and configurations.
