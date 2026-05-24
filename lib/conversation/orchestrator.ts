import { appendAssistantTurn, appendPatientTurn } from "@/lib/conversation/session";
import { generateAssistantTurn } from "@/lib/llm/adapter";
import { buildNeutralEscalation } from "@/lib/conversation/escalation";
import { CallConfig, ConversationSession } from "@/lib/domain/types";

// Count how many assistant turns have been spoken (excluding the opening line)
function assistantTurnIndex(session: ConversationSession): number {
  // Opening line is index 0 — scripted responses start at index 0 for turn 1
  return session.transcript.filter(t => t.speaker === "assistant").length - 1;
}

export async function handlePatientResponse(
  callConfig: CallConfig,
  session: ConversationSession,
  patientText: string
): Promise<ConversationSession> {
  const updatedSession = appendPatientTurn(session, patientText);
  const turnIdx = assistantTurnIndex(session); // which scripted response to use

  // ── Scripted mode — no LLM call, zero variable latency ────────────
  if (callConfig.scriptedResponses && callConfig.scriptedResponses.length > 0) {
    const line = callConfig.scriptedResponses[turnIdx];
    if (line) {
      console.log(`[Scripted] turn ${turnIdx}: "${line}"`);
      return appendAssistantTurn(updatedSession, line, "speaking");
    }
    // Script exhausted — fall through to LLM for any extra turns
    console.log(`[Scripted] script exhausted at turn ${turnIdx}, falling back to LLM`);
  }

  // ── LLM mode ───────────────────────────────────────────────────────
  const decision = await generateAssistantTurn({ callConfig, session: updatedSession, patientText });
  const nextState = decision.escalation.active ? "escalated" : "speaking";
  const assistantSession = appendAssistantTurn(updatedSession, decision.assistantText, nextState);

  return {
    ...assistantSession,
    escalation: decision.escalation
  };
}
