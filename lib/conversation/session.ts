import { CallConfig, ConversationSession, SessionMode, SessionState, TranscriptTurn } from "@/lib/domain/types";
import { buildNeutralEscalation } from "@/lib/conversation/escalation";
import { parseAddressFrom } from "@/lib/utils/parse-context";

function createTurnId() {
  return `turn-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSession(config: CallConfig, openingLine: string, mode: SessionMode = "stt"): ConversationSession {
  const openingTurn: TranscriptTurn = {
    id: createTurnId(),
    speaker: "assistant",
    text: openingLine,
    mode: "tts"
  };

  const patientDisplayName = parseAddressFrom(
    config.patient.context,
    config.patient.displayName,
    config.assistant.language
  );

  return {
    id: `session-${Date.now()}`,
    scenarioId: "runtime",
    patientDisplayName,
    mode,
    state: "ready",
    transcript: [openingTurn],
    lastAssistantLine: openingLine,
    escalation: buildNeutralEscalation()
  };
}

export function appendPatientTurn(session: ConversationSession, text: string): ConversationSession {
  return {
    ...session,
    state: session.mode === "fallback" ? "fallback" : "thinking",
    transcript: [
      ...session.transcript,
      { id: createTurnId(), speaker: "patient", text, mode: session.mode }
    ]
  };
}

export function appendAssistantTurn(session: ConversationSession, assistantText: string, state: SessionState): ConversationSession {
  return {
    ...session,
    state,
    lastAssistantLine: assistantText,
    transcript: [
      ...session.transcript,
      { id: createTurnId(), speaker: "assistant", text: assistantText, mode: "tts" }
    ]
  };
}
