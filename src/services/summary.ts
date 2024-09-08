import { parseJSONObjectFromText } from "../core/parsing.ts";
import { AgentRuntime } from "../core/runtime.ts";

export async function generateSummary(
  runtime: AgentRuntime,
  text: string,
): Promise<{ title: string; description: string }> {


  // make sure text is under 128k characters
  text = runtime.trimTokens(text, 100000, "gpt-4o-mini");

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

  const response = await runtime.completion({
    context: prompt,
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
