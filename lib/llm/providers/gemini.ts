import { inferEscalationFromPatientText } from "@/lib/conversation/escalation";
import { CallConfig, LlmDecision, Scenario } from "@/lib/domain/types";
import { GenerateAssistantTurnInput, LlmClient } from "@/lib/llm/types";

// ─── Runtime prompt builder ───────────────────────────────────────────────────
// Mirrors the OpenAI provider's buildRuntimePrompt exactly so both providers
// see the same system context.

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
    "Do NOT re-introduce yourself or say Namaste again.",
  ].join("\n");

  return (systemPrompt.trim() || "You are a helpful care follow-up assistant.") + dynamicBlock;
}

// ─── Scenario proxy for keyword escalation ────────────────────────────────────

function buildScenarioProxy(input: GenerateAssistantTurnInput): Scenario {
  const { callConfig } = input;
  return {
    id: "runtime", slug: "runtime",
    title: "runtime", summary: "runtime",
    patient: {
      id: "runtime-patient",
      fullName: callConfig.patient.displayName || "Patient",
      age: 0,
      preferredLanguage: "hindi-hinglish",
      primaryConditions: [],
    },
    medications: [],
    encounter: {
      encounterId: "runtime",
      encounterType: "post-surgery",
      summary: callConfig.patient.context.slice(0, 100),
      daysSinceEncounter: 0,
      symptomChecklist: ["pain", "bleeding", "fever", "dizziness", "chest", "breathing", "confusion"],
    },
    escalationThresholds: [],
    voice: {
      languageLabel: callConfig.assistant.language,
      tone: callConfig.assistant.persona,
      emotionalModel: callConfig.assistant.voiceModel,
      routineModel: callConfig.assistant.voiceModel,
    },
    openingLine: "",
  };
}

// ─── Gemini AI Studio response shape ─────────────────────────────────────────

type GeminiContent = { role: string; parts: Array<{ text: string }> };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

type GeminiChunk = GeminiResponse; // streamGenerateContent returns GeminiResponse[]

// ─── GeminiLlmClient ─────────────────────────────────────────────────────────

export class GeminiLlmClient implements LlmClient {
  provider = "gemini" as const;

  async generateAssistantTurn(input: GenerateAssistantTurnInput): Promise<LlmDecision> {
    const apiKey = process.env.GEMINI_API_KEY;
    const escalation = inferEscalationFromPatientText(input.patientText, buildScenarioProxy(input));

    console.log(`[LLM/Gemini] Patient: "${input.patientText}"`);
    console.log(`[LLM/Gemini] Model: ${input.callConfig.model.llmModel}`);
    console.log(`[LLM/Gemini] Escalation: ${escalation.active}`);

    if (!apiKey) {
      console.warn("[LLM/Gemini] GEMINI_API_KEY not set — using static fallback.");
      const fallback = escalation.active
        ? "[neutral] Main abhi care team ko inform kar rahi hoon. Aap please ruko."
        : "[happy] Achha, theek hai. Dawai time pe li thi na aaj?";
      return { assistantText: fallback, nextIntent: escalation.active ? "escalation" : "medication-check", escalation };
    }

    // Build conversation history for Gemini's multi-turn format
    const history: GeminiContent[] = input.session.transcript.map(turn => ({
      role: turn.speaker === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    }));

    // Current patient turn
    const userTurn: GeminiContent = { role: "user", parts: [{ text: input.patientText }] };

    const escalationNote = escalation.active
      ? `\n\n[SYSTEM] Escalation triggered — concern: ${String(escalation.concernLevel)}. Use [neutral] tone and notify patient care team is being informed.`
      : "";

    const systemInstruction = buildRuntimePrompt(input.callConfig) + escalationNote;

    const model = input.callConfig.model.llmModel; // e.g. "gemini-3.1-flash-lite"
    // streamGenerateContent returns newline-delimited JSON chunks — we collect
    // them all and pick the first candidate from the last non-empty chunk.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [...history, userTurn],
      generationConfig: {
        maxOutputTokens: input.callConfig.model.maxTokens,
        temperature: input.callConfig.model.temperature,
        thinkingConfig: { thinkingLevel: "MINIMAL" }, // fastest, lowest latency
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[LLM/Gemini] error ${res.status}:`, err);
      throw new Error(`Gemini request failed: ${res.status}`);
    }

    // streamGenerateContent returns a JSON array of response chunks
    const chunks = await res.json() as GeminiChunk[];
    // Concatenate all text parts across all chunks
    const raw = chunks
      .flatMap(c => c.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text ?? "")
      .join("")
      .trim();

    const finalText = raw || (
      escalation.active
        ? "[neutral] Main abhi care team ko inform kar rahi hoon. Aap please ruko."
        : "[happy] Theek hai. Aur koi takleef toh nahi?"
    );

    console.log(`[LLM/Gemini] → Silk: "${finalText}"`);

    return {
      assistantText: finalText,
      nextIntent: escalation.active ? "escalation" : "symptom-check",
      escalation,
    };
  }
}
