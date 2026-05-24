import { ConversationSession, Scenario } from "@/lib/domain/types";

export type CallSessionHook = {
  session: ConversationSession;
  callState: string;
  transcript: Array<{ speaker: string; text: string }>;
  respondFallback: (option: string) => void;
};

export function buildCallSessionHookInput(
  session: ConversationSession | null,
  scenario: Scenario | null
) {
  const transcript = session
    ? session.transcript.map((turn) => ({
        speaker: turn.speaker,
        text: turn.text
      }))
    : [];

  return {
    session,
    callState: session?.state ?? "idle",
    transcript,
    scenario
  };
}