import { generateText, trimTokens } from "../core/generation.ts";
import { parseJSONObjectFromText } from "../core/parsing.ts";
import { IAgentRuntime } from "../core/types.ts";

export async function generateSummary(
  runtime: IAgentRuntime,
  text: string,
): Promise<{ title: string; description: string }> {
  // make sure text is under 128k characters
  text = trimTokens(text, 100000, "gpt-4o-mini"); // TODO: clean this up

  const prompt = `Please generate a concise summary for the following text:
  
  Text: """
  ${text}
  """
  
  Respond with a JSON object in the following format:
  \`\`\`json
  {
    "title": "Generated Title",
    "summary": "Generated summary and/or description of the text"
  }
  \`\`\``;

  const response = await generateText({
    runtime,
    context: prompt,
    modelClass: "fast"
  });

  const parsedResponse = parseJSONObjectFromText(response);

  if (parsedResponse) {
    return {
      title: parsedResponse.title,
      description: parsedResponse.summary,
    };
  }

  return {
    title: "",
    description: "",
  };
}
