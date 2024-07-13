import {
    Content
} from "bgent";
import fs from "fs";
import { adapter } from "./db.ts";

// for each item in lore, insert into memories with the type "lore"
// check if lore.json exists, if it does thn read it
const loreExists = fs.existsSync("lore.json");
export const lore = loreExists ? JSON.parse(fs.readFileSync("lore.json", "utf8")) : [];
for (const item of lore as {
  source: string;
  content: Content;
  embedding: number[];
}[]) {
  const { source, content, embedding } = item;
  adapter.db
    .prepare("INSERT INTO memories (type, content, embedding) VALUES (?, ?, ?)")
    .run("lore", JSON.stringify(content), JSON.stringify(embedding));
}

const bioExists = fs.existsSync("bioExists.json");
export const bio = bioExists ? JSON.parse(fs.readFileSync("bio.json", "utf8")) : "";
