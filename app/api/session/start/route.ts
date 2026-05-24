import { NextRequest, NextResponse } from "next/server";
import { CallConfig, ConversationSession } from "@/lib/domain/types";
import { startCall } from "@/lib/store/call-store";

export async function POST(request: NextRequest) {
  const { callConfig, session } = await request.json() as {
    callConfig: CallConfig;
    session: ConversationSession;
  };

  if (!callConfig || !session) {
    return NextResponse.json({ error: "callConfig and session required" }, { status: 400 });
  }

  const record = startCall(callConfig, session);
  return NextResponse.json({ ok: true, callId: record.id, call: record }, {
    headers: { "Cache-Control": "no-store" }
  });
}
