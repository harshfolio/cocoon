import { inferEscalationFromPatientText } from "@/lib/conversation/escalation";
import { CallConfig, LlmDecision, Scenario } from "@/lib/domain/types";
import { GenerateAssistantTurnInput, LlmClient } from "@/lib/llm/types";

type OpenAiResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

// Build the runtime prompt: user's system prompt + auto-appended patient context block.
function buildRuntimePrompt(config: CallConfig): string {
  const { assistant, patient, systemPrompt } = config;

  const dynamicBlock = [
    "",
    "---",
    "## Patient context for this call",
    patient.context.trim() || "(no patient context provided)",
    "",
    `Caller name: ${assistant.name || "Nisha"}`,
    "The greeting has already been given. Continue mid-conversation naturally.",
    "Do NOT re-introduce yourself or say Namaste again."
  ].join("\n");

  return (systemPrompt.trim() || "You are a helpful care follow-up assistant.") + dynamicBlock;
}

export class OpenAiLlmClient implements LlmClient {
  provider = "openai" as const;

  async generateAssistantTurn(input: GenerateAssistantTurnInput): Promise<LlmDecision> {
    // Build a minimal Scenario proxy for the keyword-based escalation classifier
    const scenarioProxy: Scenario = {
      id: "runtime", slug: "runtime",
      title: "runtime", summary: "runtime",
      patient: {
        id: "runtime-patient",
        fullName: input.callConfig.patient.displayName || "Patient",
        age: 0,
        preferredLanguage: "hindi-hinglish",
        primaryConditions: []
      },
      medications: [],
      encounter: {
        encounterId: "runtime",
        encounterType: "post-surgery",
        summary: input.callConfig.patient.context.slice(0, 100),
        daysSinceEncounter: 0,
        // Extract symptom keywords from free-text context for escalation matching
        symptomChecklist: ["pain", "bleeding", "fever", "dizziness", "chest", "breathing", "confusion"]
      },
      escalationThresholds: [],
      voice: {
        languageLabel: input.callConfig.assistant.language,
        tone: input.callConfig.assistant.persona,
        emotionalModel: input.callConfig.assistant.voiceModel,
        routineModel: input.callConfig.assistant.voiceModel
      },
      openingLine: ""
    };

    const escalation = inferEscalationFromPatientText(input.patientText, scenarioProxy);
    const apiKey = process.env.OPENAI_API_KEY;

    console.log(`[LLM] Patient said: "${input.patientText}"`);
    console.log(`[LLM] Model: ${input.callConfig.model.llmModel}, temp: ${input.callConfig.model.temperature}`);
    console.log(`[LLM] Escalation: ${escalation.active}, concern: ${String(escalation.concernLevel)}`);

    if (!apiKey) {
      console.warn("[LLM] OPENAI_API_KEY not set — using static fallback.");
      const fallbackText = escalation.active
        ? "[neutral] Main abhi care team ko inform kar rahi hoon. Aap please ruko."
        : "[happy] Achha, theek hai. <chuckle> Dawai time pe li thi na aaj?";
      return { assistantText: fallbackText, nextIntent: escalation.active ? "escalation" : "medication-check", escalation };
    }

    const historyMessages = input.session.transcript.map((turn) => ({
      role: turn.speaker === "assistant" ? "assistant" as const : "user" as const,
      content: turn.text
    }));

    const escalationNote = escalation.active
      ? `[SYSTEM] Escalation triggered — concern: ${String(escalation.concernLevel)}, action: ${String(escalation.recommendedAction)}. Use [neutral] tone and notify patient that care team is being informed.`
      : "";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: input.callConfig.model.llmModel,
        messages: [
          { role: "system", content: buildRuntimePrompt(input.callConfig) },
          ...historyMessages,
          { role: "user", content: input.patientText },
          ...(escalationNote ? [{ role: "system" as const, content: escalationNote }] : [])
        ],
        max_tokens: input.callConfig.model.maxTokens,
        temperature: input.callConfig.model.temperature
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[LLM] OpenAI error ${response.status}:`, err);
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const payload = (await response.json()) as OpenAiResponse;
    const assistantText = payload.choices?.[0]?.message?.content?.trim();

    const finalText = assistantText || (
      escalation.active
        ? "[neutral] Main abhi care team ko inform kar rahi hoon. Aap please ruko."
        : "[happy] Theek hai. <chuckle> Aur koi takleef toh nahi?"
    );

    console.log(`[LLM] → Silk: "${finalText}"`);

    return {
      assistantText: finalText,
      nextIntent: escalation.active ? "escalation" : "symptom-check",
      escalation
    };
  }
}
