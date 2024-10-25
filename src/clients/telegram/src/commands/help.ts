// src/commands/help.ts

import { Context } from "telegraf";

export const helpCommand = (ctx: Context) => {
  try {
    ctx.replyWithMarkdown(
      `🤖 *Bot Help*

*Here are the commands you can use:*

• /help - _Show this help message._
• /about - _Learn more about *DegenAI*._

You can chat with me by mentioning *@${ctx.botInfo.username}* in any chat!`
    );
  } catch (error) {
    console.error("❌ Error in /help command handler:", error);
    ctx.reply("❌ Oops! Something went wrong while displaying the help message.");
  }
};
