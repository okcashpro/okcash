// src/commands/about.ts

import { Context } from "telegraf";

export const aboutCommand = (ctx: Context) => {
  try {
    ctx.replyWithMarkdown(
      `🤖 *About DegenAI Bot*\n\nA Telegram bot created by the DegenAI Team.`
    );
  } catch (error) {
    console.error("❌ Error in /about command handler:", error);
    ctx.reply("❌ Oops! Something went wrong while fetching the about message.");
  }
};
