---
id: "index"
title: "API Doc"
sidebar_label: "Readme"
sidebar_position: 0
custom_edit_url: null
---

# eliza

A flexible, scalable and customizable agent for production apps. Comes with batteries-including database, deployment and examples using Supabase and Cloudflare.

![cj](https://github.com/jointhealliance/eliza/assets/18633264/7513b5a6-2352-45f3-8b87-7ee0e2171a30)

[![npm version](https://badge.fury.io/js/eliza.svg)](https://badge.fury.io/js/eliza)
![build passing](https://github.com/JoinTheAlliance/eliza/actions/workflows/build.yaml/badge.svg)
![tests passing](https://github.com/JoinTheAlliance/eliza/actions/workflows/test.yaml/badge.svg)
![lint passing](https://github.com/JoinTheAlliance/eliza/actions/workflows/lint.yaml/badge.svg)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://github.com/jointhealliance/eliza/blob/main/LICENSE)
[![stars - eliza](https://img.shields.io/github/stars/jointhealliance/eliza?style=social)](https://github.com/jointhealliance/eliza)
[![forks - eliza](https://img.shields.io/github/forks/jointhealliance/eliza?style=social)](https://github.com/jointhealliance/eliza)

## Connect With Us

[![Join the Discord server](https://dcbadge.vercel.app/api/server/qetWd7J9De)](https://discord.gg/jointhealliance)

## Features

- 🛠 Simple and extensible
- 🎨 Customizable to your use case
- 📚 Easily ingest and interact with your documents
- 💾 Retrievable memory and document store
- ☁️ Serverless architecture
- 🚀 Deployable in minutes at scale with Cloudflare
- 👥 Multi-agent and room support
- 🎯 Goal-directed behavior
- 📦 Comes with ready-to-deploy examples

## What can I use it for?
- 🤖 Chatbots
- 🕵️ Autonomous Agents
- 📈 Business process handling
- 🎮 Video game NPCs

## Try the agent

```
npx eliza
```

## Installation

Currently eliza is dependent on Supabase for local development. You can install it with the following command:

```bash
npm install eliza

# Select your database adapter
npm install sqlite-vss better-sqlite3 # for sqlite (simple, for local development)
npm install @supabase/supabase-js # for supabase (more complicated but can be deployed at scale)
```

### Set up environment variables

You will need a Supbase account, as well as an OpenAI developer account.

Copy and paste the `.dev.vars.example` to `.dev.vars` and fill in the environment variables:

```bash
SUPABASE_URL="https://your-supabase-url.supabase.co"
SUPABASE_SERVICE_API_KEY="your-supabase-service-api-key"
OPENAI_API_KEY="your-openai-api-key"
```

### SQLite Local Setup (Easiest)

You can use SQLite for local development. This is the easiest way to get started with eliza.

```typescript
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

First, you will need to install the Supabase CLI. You can install it using the instructions [here](https://supabase.com/docs/guides/cli/getting-started).

Once you have the CLI installed, you can run the following commands to set up a local Supabase instance:

```bash
supabase init
```

```bash
supabase start
```

You can now start the eliza project with `npm run dev` and it will connect to the local Supabase instance by default.

**NOTE**: You will need Docker installed for this to work. If that is an issue for you, use the _Supabase Cloud Setup_ instructions instead below).

### Supabase Cloud Setup

This library uses Supabase as a database. You can set up a free account at [supabase.io](https://supabase.io) and create a new project.

- Step 1: On the Subase All Projects Dashboard, select “New Project”.
- Step 2: Select the organization to store the new project in, assign a database name, password and region.
- Step 3: Select “Create New Project”.
- Step 4: Wait for the database to setup. This will take a few minutes as supabase setups various directories.
- Step 5: Select the “SQL Editor” tab from the left navigation menu.
- Step 6: Copy in your own SQL dump file or optionally use the provided file in the eliza directory at: "src/supabase/db.sql". Note: You can use the command "supabase db dump" if you have a pre-exisiting supabase database to generate the SQL dump file.
- Step 7: Paste the SQL code into the SQL Editor and hit run in the bottom right.
- Step 8: Select the “Databases” tab from the left navigation menu to verify all of the tables have been added properly.

Once you've set up your Supabase project, you can find your API key by going to the "Settings" tab and then "API". You will need to set the `SUPABASE_URL` and `SUPABASE_SERVICE_API_KEY` environment variables in your `.dev.vars` file.

## Local Model Setup

While eliza uses ChatGPT 3.5 by default, you can use a local model by setting the `serverUrl` to a local endpoint. The [LocalAI](https://localai.io/) project is a great way to run a local model with a compatible API endpoint.

```typescript
const runtime = new BgentRuntime({
  serverUrl: process.env.LOCALAI_URL,
  token: process.env.LOCALAI_TOKEN, // Can be an API key or JWT token for your AI service
  // ... other options
});
```

## Development

```
npm run dev # start the server
npm run shell # start the shell in another terminal to talk to the default agent
```

## Usage

```typescript
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

## Custom Actions

Eliza is customized through actions and evaluators. Actions are functions that are called when a user input is received, and evaluators are functions that are called when a condition is met at the end of a conversation turn.

An example of an action is `wait` (the agent should stop and wait for the user to respond) or `elaborate` (the agent should elaborate and write another message in the conversation).

An example of a evaluator is `fact` (the agent should summarize the conversation so far).

```typescript
import { wait, fact } from "eliza";

const runtime = new BgentRuntime({
  // ... other options
  actions: [wait],
  evaluators: [fact],
});

// OR you can register actions and evaluators after the runtime has been created
bgentRuntime.registerAction(wait);
bgentRuntime.registerEvaluator(fact);
```

## Custom Data Sources
If you want to add custom data into the context that is sent to the LLM, you can create a `Provider` and add it to the runtime.

```typescript
import { type BgentRuntime, type Message, type Provider, type State } from "eliza";

const time: Provider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get: async (_runtime: BgentRuntime, _message: Message, _state?: State) => {
    const currentTime = new Date().toLocaleTimeString("en-US");
    return "The current time is: " + currentTime;
  },
};

const runtime = new BgentRuntime({
  // ... other options
  providers: [time],
});
```

## Handling User Input

The BgentRuntime instance has a `handleMessage` method that can be used to handle user input. The method returns a promise that resolves to the agent's response.

You will need to make sure that the room_id already exists in the database. You can use the Supabase client to create new users and rooms if necessary.

```typescript
const message = {
  user_id: "user-uuid", // Replace with the sender's UUID
  content: { content: content }, // The message content
  room_id: "room-uuid", // Replace with the room's UUID
};
const response = await bgentRuntime.handleMessage(message);
console.log("Agent response:", response);
```

## Example Agents

There are two examples which are set up for cloudflare in `src/agents`

- The `simple` example is a simple agent that can be deployed to cloudflare workers
- The `cj` example is a more complex agent that has the ability to introduce users to each other. This agent is also deployable to cloudflare workers, and is the default agent in [Cojourney](https://cojourney.app).

An external example of an agent is the `afbot` Aframe Discord Bot, which is a discord bot that uses eliza as a backend. You can find it [here](https://github.com/JoinTheAlliance/afbot).

### Deploy to Cloudflare

To deploy an agent to Cloudflare, you can run `npm run deploy` -- this will by default deploy the `cj` agent. To deploy your own agent, see the [afbot](https://github.com/JoinTheAlliance/afbot) example.

## API Documentation

Complete API documentation is available at https://eliza.org/docs

## Contributions Welcome

This project is made by people like you. No contribution is too small. We welcome your input and support. Please file an issue if you notice something that needs to be resolved, or [join us on Discord](https://discord.gg/jointhealliance) to discuss working with us on fixes and new features.
