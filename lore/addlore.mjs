import s from '@supabase/supabase-js';
import { BgentRuntime, SupabaseDatabaseAdapter, addLore } from 'bgent';
import dotenv from 'dotenv';
const { SupabaseClient } = s;
dotenv.config();

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://rnxwpsbkzcugmqauwdax.supabase.co';
const SUPABASE_SERVICE_API_KEY = process.env.SUPABASE_API_KEY;
const SERVER_URL = 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const zeroUuid = '00000000-0000-0000-0000-000000000000';

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_API_KEY);

const runtime = new BgentRuntime({
  debugMode: process.env.NODE_ENV === 'development',
  databaseAdapter: new SupabaseDatabaseAdapter(
    SUPABASE_URL,
    SUPABASE_SERVICE_API_KEY,
  ),
  serverUrl: SERVER_URL,
  token: OPENAI_API_KEY,
  actions: [],
  evaluators: [],
});

// Example array of strings
import stringsToProcess from './allfacts.mjs';

const processStrings = async (strings) => {
  for (const content of strings) {
    console.log(`Adding string to lore: ${content}`);
      await addLore({
        runtime,
        source: 'book',
        content: { content },
        embedContent: { content },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('All strings processed.');
};

const main = async () => {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', zeroUuid);

  if (error) {
    console.error('Error fetching accounts:', error);
    return;
  }

  if (accounts.length === 0) {
    await supabase.from('accounts').upsert({
      id: zeroUuid,
      name: 'Default Agent',
      email: 'default@agent',
      register_complete: true,
      details: {},
    });
  }

  const { data: rooms, error: error2 } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', zeroUuid);

  if (error2) {
    console.error('Error fetching rooms:', error2);
    return;
  }

  if (rooms.length === 0) {
    await supabase.from('rooms').upsert({
      id: zeroUuid,
      name: 'Lore Room',
      created_by: zeroUuid,
    });
  }

  console.log('Processing strings:', stringsToProcess);
  await processStrings(stringsToProcess);
  console.log('Done processing strings.');
};

main();