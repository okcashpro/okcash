---
sidebar_position: 5
---

# Basic Usage

This guide covers the fundamental concepts and patterns for using Eliza in your applications.

## Creating an Agent Runtime

The first step is to initialize an agent runtime with your desired configuration:
```
import { AgentRuntime, SqliteDatabaseAdapter } from "eliza";
import { Database } from "sqlite3";
const sqliteDatabaseAdapter = new SqliteDatabaseAdapter(new Database(":memory:"));
const runtime = new AgentRuntime({
serverUrl: "https://api.openai.com/v1",
token: process.env.OPENAI_API_KEY,
databaseAdapter: sqliteDatabaseAdapter,
model: "gpt-3.5-turbo",
embeddingModel: "text-embedding-3-small"
});
```

## Loading Characters

Characters can be loaded from JSON files:
```json
{
"name": "character_name",
"bio": [],
"lore": [],
"knowledge": [],
"style": {}
}
```

Load the character:
```
node --loader ts-node/esm src/index.ts --characters="path/to/your/character.json"
```

## Working with Memory

Process different types of content:
```
// Process documents
await runtime.processDocument("path/to/document.pdf");
await runtime.processUrl("https://example.com");
await runtime.processText("Important information");
```

Use the knowledge management tools:
```bash
npx folder2knowledge ./docs
npx knowledge2character my-character.json knowledge.json
```

## Platform Integration

Set up Discord integration:
```
import { DiscordConnector } from "eliza";
const discord = new DiscordConnector({
token: process.env.DISCORD_TOKEN,
runtime: runtime
});
await discord.start();
```

Set up Twitter integration:
```
import { TwitterConnector } from "eliza";
const twitter = new TwitterConnector({
username: process.env.TWITTER_USERNAME,
password: process.env.TWITTER_PASSWORD,
runtime: runtime
});
await twitter.start();
```


## Development Commands

Start the server:
```bash
pnpm run dev
```


Start the interactive shell:
```bash
pnpm run shell
```

## Next Steps

- Learn about [Configuration](./configuration) options
- Explore [Advanced Features](./advanced)
- Read about [Character Files](./characterfile)

For API details, see the [API Reference](../api).
