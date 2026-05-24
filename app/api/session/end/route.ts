import { NextRequest, NextResponse } from "next/server";
import { ConversationSession } from "@/lib/domain/types";
import { endCall, updateSummary, getActiveCall } from "@/lib/store/call-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { session } = await request.json() as { session: ConversationSession };
  const activeCall = getActiveCall();

  if (!activeCall) {
    return NextResponse.json({ ok: true, message: "No active call" }, {
      headers: { "Cache-Control": "no-store" }
    });
  }

  const status = session?.escalation?.active ? "escalated" : "completed";
  endCall(status, null);

  // Fire async LLM summary — don't block the response
  void extractSummary(session, activeCall.callConfig?.model?.llmModel ?? "gpt-4o-mini");

  return NextResponse.json({ ok: true }, {
    headers: { "Cache-Control": "no-store" }
  });
}

async function extractSummary(
  session: ConversationSession,
  model: string
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !session?.transcript?.length) return;

  const transcriptText = session.transcript
    .filter(t => t.speaker !== "system")
    .map(t => {
      const speaker = t.speaker === "assistant" ? "Nisha" : "Patient";
      const text = t.text.replace(/^\[.*?\]\s*/, "").replace(/<[^>]+>/g, "").trim();
      return `${speaker}: ${text}`;
    })
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Summarise this patient follow-up call in one clear sentence. Be factual and clinical. Include: medication status, key symptoms reported, and any action needed. Do not start with 'The patient' — start with the medication or symptom status directly."
          },
          { role: "user", content: transcriptText }
        ],
        max_tokens: 80,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const summary = data.choices?.[0]?.message?.content?.trim();
    if (summary) updateSummary(summary);
  } catch {
    // Non-fatal — summary just won't appear
  }
}
