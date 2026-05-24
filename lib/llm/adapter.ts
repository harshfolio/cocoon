import { GeminiLlmClient } from "@/lib/llm/providers/gemini";
import { OpenAiLlmClient } from "@/lib/llm/providers/openai";
import { GenerateAssistantTurnInput, LlmClient } from "@/lib/llm/types";

// Route by model name — gemini-* uses Gemini, everything else uses OpenAI.
// LLM_PROVIDER env is a fallback override for cases where no callConfig is available.
function createLlmClientForModel(model: string): LlmClient {
  if (model.startsWith("gemini") || process.env.LLM_PROVIDER === "gemini") {
    return new GeminiLlmClient();
  }
  return new OpenAiLlmClient();
}

export function createLlmClient(): LlmClient {
  if (process.env.LLM_PROVIDER === "gemini") return new GeminiLlmClient();
  return new OpenAiLlmClient();
}

export async function generateAssistantTurn(input: GenerateAssistantTurnInput) {
  const client = createLlmClientForModel(input.callConfig.model.llmModel);
  return client.generateAssistantTurn(input);
}
