---
sidebar_position: 3
---

# Installation

Currently eliza is dependent on Supabase for local development. You can install it with the following command:

`pnpm install eliza`

## Select your database adapter

```
pnpm install sqlite-vss better-sqlite3 # for sqlite (simple, for local development)

pnpm install @supabase/supabase-js # for supabase (more complicated but can be deployed at scale)
```

### Set up environment variables

You will need a Supbase account, as well as an OpenAI developer account.

Copy and paste the .dev.vars.example to .dev.vars and fill in the environment variables:

```
SUPABASE_URL="https://your-supabase-url.supabase.co"
SUPABASE_SERVICE_API_KEY="your-supabase-service-api-key"
OPENAI_API_KEY="your-openai-api-key"
```

### SQLite Local Setup (Easiest)

You can use SQLite for local development. This is the easiest way to get started with eliza.

```
import { BgentRuntime, SqliteDatabaseAdapter } from "eliza";
import { Database } from "sqlite3";
const sqliteDatabaseAdapter = new SqliteDatabaseAdapter(new Database(":memory:"));

const runtime = new BgentRuntime({
  serverUrl: "https://api.openai.com/v1",
  token: process.env.OPENAI_API_KEY, // Can be an API key or JWT token for your AI services
  databaseAdapter: sqliteDatabaseAdapter,
  // ... other options
});
```

### Supabase Local Setup

First, you will need to install the Supabase CLI. You can install it using the instructions here.

Once you have the CLI installed, you can run the following commands to set up a local Supabase instance:

```
supabase init
supabase start
```

You can now start the eliza project with `pnpm run dev` and it will connect to the local Supabase instance by default.

NOTE: You will need Docker installed for this to work. If that is an issue for you, use the Supabase Cloud Setup instructions instead below).

### Supabase Cloud Setup

This library uses Supabase as a database. You can set up a free account at supabase.io and create a new project.

- Step 1: On the Subase All Projects Dashboard, select “New Project”.
- Step 2: Select the organization to store the new project in, assign a database name, password and region.
- Step 3: Select “Create New Project”.
- Step 4: Wait for the database to setup. This will take a few minutes as supabase setups various directories.
- Step 5: Select the “SQL Editor” tab from the left navigation menu.
- Step 6: Copy in your own SQL dump file or optionally use the provided file in the eliza directory at: "src/supabase/db.sql". Note: You can use the command "supabase db dump" if you have a pre-exisiting supabase database to generate the SQL dump file.
- Step 7: Paste the SQL code into the SQL Editor and hit run in the bottom right.
- Step 8: Select the “Databases” tab from the left navigation menu to verify all of the tables have been added properly.

Once you've set up your Supabase project, you can find your API key by going to the "Settings" tab and then "API". You will need to set the` SUPABASE_URL and SUPABASE_SERVICE_API_KEY` environment variables in your `.dev.vars` file.

### Local Model Setup

While eliza uses ChatGPT 3.5 by default, you can use a local model by setting the serverUrl to a local endpoint. The LocalAI project is a great way to run a local model with a compatible API endpoint.

```
const runtime = new BgentRuntime({
  serverUrl: process.env.LOCALAI_URL,
  token: process.env.LOCALAI_TOKEN, // Can be an API key or JWT token for your AI service
  // ... other options
});
```

### Development

```
pnpm run dev # start the server

pnpm run shell # start the shell in another terminal to talk to the default agent
```

### Usage

```
      import { BgentRuntime, SupabaseDatabaseAdapter, SqliteDatabaseAdapter } from "eliza";

      const sqliteDatabaseAdapter = new SqliteDatabaseAdapter(new Database(":memory:"));


      // You can also use Supabase like this
      // const supabaseDatabaseAdapter = new SupabaseDatabaseAdapter(
      //   process.env.SUPABASE_URL,
      //   process.env.SUPABASE_SERVICE_API_KEY)
      //   ;


      const runtime = new BgentRuntime({
        serverUrl: "https://api.openai.com/v1",
        token: process.env.OPENAI_API_KEY, // Can be an API key or JWT token for your AI services
        databaseAdapter: sqliteDatabaseAdapter,
        actions: [
          /* your custom actions */
        ],
        evaluators: [
          /* your custom evaluators */
        ],
        model: "gpt-3.5-turbo", // whatever model you want to use
        embeddingModel: "text-embedding-3-small", // whatever model you want to use
      });
```
