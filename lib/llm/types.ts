import { CallConfig, ConversationSession, LlmDecision } from "@/lib/domain/types";

export type LlmProvider = "openai" | "gemini";

export type GenerateAssistantTurnInput = {
  callConfig: CallConfig;
  session: ConversationSession;
  patientText: string;
};

export type LlmClient = {
  provider: LlmProvider;
  generateAssistantTurn(input: GenerateAssistantTurnInput): Promise<LlmDecision>;
};
