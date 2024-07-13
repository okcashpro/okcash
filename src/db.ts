import Database from "better-sqlite3";
import {
    SqliteDatabaseAdapter
} from "bgent";
import { load } from "./sqlite_vss.ts";

// SQLite adapter
export const adapter = new SqliteDatabaseAdapter(new Database(":memory:"));

// Load sqlite-vss
load((adapter as SqliteDatabaseAdapter).db);