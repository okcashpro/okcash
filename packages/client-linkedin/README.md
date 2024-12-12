# @ai16z/client-linkedin

LinkedIn client integration for AI16Z agents. This package provides functionality for AI agents to interact with LinkedIn, including:

- Automated post creation and scheduling
- Professional interaction management
- Message and comment handling
- Connection management
- Activity tracking

## Installation

```bash
pnpm add @ai16z/client-linkedin
```

## Configuration

Set the following environment variables:

```env
LINKEDIN_USERNAME=your.email@example.com
LINKEDIN_PASSWORD=your_password
LINKEDIN_DRY_RUN=false
POST_INTERVAL_MIN=24
POST_INTERVAL_MAX=72
```

## Usage

```typescript
import { LinkedInClientInterface } from '@ai16z/client-linkedin';

// Initialize the client
const manager = await LinkedInClientInterface.start(runtime);

// The client will automatically:
// - Generate and schedule posts
// - Respond to messages and comments
// - Manage connections
// - Track activities
```

## Features

- Professional content generation
- Rate-limited API interactions
- Conversation history tracking
- Connection management
- Activity monitoring
- Cache management

## License

MIT
