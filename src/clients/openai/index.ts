import OpenAI from "openai";
import settings from "../../core/settings.ts";

export const openAI = new OpenAI({
    apiKey: settings.OPENAI_API_KEY,
  });