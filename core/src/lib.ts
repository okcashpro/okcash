import Database from "better-sqlite3";
import fs from "fs";
import yargs from "yargs";
import askClaude from "./actions/ask_claude.ts";
import follow_room from "./actions/follow_room.ts";
import imageGeneration from "./actions/imageGeneration.ts";
import mute_room from "./actions/mute_room.ts";
import swap from "./actions/swap.ts";
import unfollow_room from "./actions/unfollow_room.ts";
import unmute_room from "./actions/unmute_room.ts";
import { PostgresDatabaseAdapter } from "./adapters/postgres.ts";
import { SqliteDatabaseAdapter } from "./adapters/sqlite.ts";
import DirectClient from "./clients/direct/index.ts";
import { DiscordClient } from "./clients/discord/index.ts";
import { TelegramClient } from "./clients/telegram/src/index.ts"; // Added Telegram import
import { TwitterGenerationClient } from "./clients/twitter/generate.ts";
import { TwitterInteractionClient } from "./clients/twitter/interactions.ts";
import { TwitterSearchClient } from "./clients/twitter/search.ts";
import { wait } from "./clients/twitter/utils.ts";
import { defaultActions } from "./core/actions.ts";
import defaultCharacter from "./core/defaultCharacter.ts";
import { AgentRuntime } from "./core/runtime.ts";
import settings from "./core/settings.ts";
import { Character, IAgentRuntime, ModelProvider } from "./core/types.ts"; // Added IAgentRuntime
import boredomProvider from "./providers/boredom.ts";
import timeProvider from "./providers/time.ts";
import walletProvider from "./providers/wallet.ts";
import readline from "readline";
import orderbook from "./providers/order_book.ts";
import tokenProvider from "./providers/token.ts";

export {
    askClaude,
    follow_room,
    imageGeneration,
    mute_room,
    swap,
    unfollow_room,
    unmute_room,
    PostgresDatabaseAdapter,
    SqliteDatabaseAdapter,
    DirectClient,
    DiscordClient,
    TelegramClient,
    TwitterGenerationClient,
    TwitterInteractionClient,
    TwitterSearchClient,
};
