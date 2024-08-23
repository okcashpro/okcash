import Database from "better-sqlite3";
import { SqliteDatabaseAdapter } from "../adapters/sqlite.ts";
import { load } from "../adapters/sqlite/sqlite_vss.ts";

// SQLite adapter
export const adapter = new SqliteDatabaseAdapter(new Database("./db.sqlite"));

// Load sqlite-vss
load((adapter as SqliteDatabaseAdapter).db);
