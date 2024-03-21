import Database from 'better-sqlite3';
import { BgentRuntime, SqliteDatabaseAdapter } from 'bgent';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import { load } from "./sqlite_vss.mjs";

// Get the file path of the current module
const __filename = fileURLToPath(import.meta.url);

// Get the directory name of the current module
const __dirname = path.dirname(__filename);


dotenv.config();

const SERVER_URL = 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const databaseAdapter = new SqliteDatabaseAdapter(new Database(":memory:"));
load(databaseAdapter.db);

const runtime = new BgentRuntime({
  databaseAdapter,
  debugMode: process.env.NODE_ENV === 'development',
  serverUrl: SERVER_URL,
  token: OPENAI_API_KEY,
  actions: [],
  evaluators: [],
});

// Assuming stringsToProcess is already imported
import stringsToProcess from './allfacts.mjs';

const processStrings = async (strings) => {
  const filePath = join(__dirname, '../src/lore.json');
  let loreArray;

  try {
    // Try to read the existing lore file
    const data = await fs.readFile(filePath, 'utf8');
    loreArray = JSON.parse(data);
  } catch (error) {
    // If the file does not exist or an error occurs, start with an empty array
    loreArray = [];
  }

  for (const content of strings) {
    console.log(`Adding string to lore: ${content}`);
    const lore = {
      source: 'book',
      content: { content },
      embedContent: { content },
      embedding: await runtime.embed(content)
    };

    loreArray.push(lore);

    // Write the updated array back to the file
    await fs.writeFile(filePath, JSON.stringify(loreArray, null, 2));
    
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('All strings processed and saved to lore.json.');
};

const main = async () => {
  console.log('Processing strings:', stringsToProcess);
  await processStrings(stringsToProcess);
  console.log('Done processing strings.');
};

main();
