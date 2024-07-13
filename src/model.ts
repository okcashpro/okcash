import OpenAI from "openai";
import settings from "./settings.ts";

export const openAI = new OpenAI({
    apiKey: settings.OPENAI_API_KEY,
  });