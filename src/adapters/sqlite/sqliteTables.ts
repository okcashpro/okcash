export const sqliteTables = `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Table: accounts
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT PRIMARY KEY,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "avatar_url" TEXT,
    "details" TEXT DEFAULT '{}' CHECK(json_valid("details")) -- Ensuring details is a valid JSON field
);

-- Table: memories
CREATE TABLE IF NOT EXISTS "memories" (
    "id" TEXT PRIMARY KEY,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "embedding" BLOB NOT NULL, -- TODO: EMBEDDING ARRAY, CONVERT TO BEST FORMAT FOR SQLITE-VSS (JSON?)
    "user_id" TEXT,
    "room_id" TEXT,
    "unique" INTEGER DEFAULT 1 NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "accounts"("id"),
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
);

-- Table: goals
CREATE TABLE IF NOT EXISTS "goals" (
    "id" TEXT PRIMARY KEY,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "name" TEXT,
    "status" TEXT,
    "description" TEXT,
    "room_id" TEXT,
    "objectives" TEXT DEFAULT '[]' NOT NULL CHECK(json_valid("objectives")) -- Ensuring objectives is a valid JSON array
);

-- Table: logs
CREATE TABLE IF NOT EXISTS "logs" (
    "id" TEXT PRIMARY KEY,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "room_id" TEXT NOT NULL
);

-- Table: participants
CREATE TABLE IF NOT EXISTS "participants" (
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "room_id" TEXT,
    "user_state" TEXT,
    "id" TEXT PRIMARY KEY,
    "last_message_read" TEXT,
    FOREIGN KEY ("user_id") REFERENCES "accounts"("id"),
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id")
);

-- Table: relationships
CREATE TABLE IF NOT EXISTS "relationships" (
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "user_a" TEXT NOT NULL,
    "user_b" TEXT NOT NULL,
    "status" "text",
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    FOREIGN KEY ("user_a") REFERENCES "accounts"("id"),
    FOREIGN KEY ("user_b") REFERENCES "accounts"("id"),
    FOREIGN KEY ("user_id") REFERENCES "accounts"("id")
);

-- Table: rooms
CREATE TABLE IF NOT EXISTS "rooms" (
    "id" TEXT PRIMARY KEY,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index: relationships_id_key
CREATE UNIQUE INDEX IF NOT EXISTS "relationships_id_key" ON "relationships" ("id");

-- Index: memories_id_key
CREATE UNIQUE INDEX IF NOT EXISTS "memories_id_key" ON "memories" ("id");

-- Index: participants_id_key
CREATE UNIQUE INDEX IF NOT EXISTS "participants_id_key" ON "participants" ("id");

COMMIT;`;
