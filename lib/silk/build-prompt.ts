import { ConversationIntent } from "@/lib/domain/types";

// ─── Tone extraction ──────────────────────────────────────────────────────────
//
// LLM outputs text like: "[happy] Namaste Harsh, aaj..."
// We extract the marker and use it directly in the Silk/Muga prompt.
// This is the key to expressiveness — never override what the LLM chose.

export type MugaTone = "neutral" | "happy" | "sad" | "excited" | "angry" | "whisper";

const TONE_PATTERN = /^\[(happy|sad|neutral|excited|angry|whisper)\]\s*/i;

/**
 * Extract the tone marker from LLM output.
 * Returns the tone and the clean text (marker stripped).
 */
export function extractTone(text: string): { tone: MugaTone; cleanText: string } {
  const match = TONE_PATTERN.exec(text.trim());
  if (match) {
    return {
      tone: match[1].toLowerCase() as MugaTone,
      cleanText: text.trim().slice(match[0].length).trim(),
    };
  }
  return { tone: "neutral", cleanText: text.trim() };
}

/**
 * Build the Muga prompt — preserving the LLM's own tone marker.
 * If the text already has a valid marker, it passes through unchanged.
 * If not, the provided defaultTone is injected.
 */
export function buildMugaPrompt(text: string, defaultTone: MugaTone = "neutral"): string {
  const trimmed = text.trim();
  if (TONE_PATTERN.test(trimmed)) {
    return trimmed; // LLM chose the tone — respect it
  }
  return `[${defaultTone}] ${trimmed}`;
}

/**
 * Build the Mulberry 1.5 voice description.
 * Per Silk skill: one short concrete sentence, 3-5 attributes, role anchor.
 */
export function buildMulberryDescription(languageLabel: string, _posture: string): string {
  const isHindi = /hindi|hinglish/i.test(languageLabel);
  if (isHindi) {
    return "a warm 30s hindi accent female voice, conversational pacing, calm and reassuring, healthcare assistant";
  }
  return "a warm 30s indian female voice, conversational pacing, calm and reassuring, healthcare assistant";
}

// ─── Intent classification ────────────────────────────────────────────────────
//
// All intents now use muga with the LLM's tone — not just escalation/reassurance.
// We keep this for future mulberry routing but no longer gate expressiveness on it.

const EMOTIONAL_INTENTS: Set<ConversationIntent> = new Set([
  "escalation",
  "reassurance",
]);

export function isEmotionalTurn(intent: ConversationIntent): boolean {
  return EMOTIONAL_INTENTS.has(intent);
}
