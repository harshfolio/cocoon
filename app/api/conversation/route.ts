import { NextRequest, NextResponse } from "next/server";
import { handlePatientResponse } from "@/lib/conversation/orchestrator";
import { createSession } from "@/lib/conversation/session";
import { CallConfig, ConversationSession, SessionMode } from "@/lib/domain/types";
import { parseAddressFrom } from "@/lib/utils/parse-context";
import { updateSession } from "@/lib/store/call-store";

type ConversationRequest = {
  action: "start" | "respond";
  callConfig: CallConfig;
  openingLine?: string;
  mode?: SessionMode;
  patientText?: string;
  session?: ConversationSession;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ConversationRequest;
  const { callConfig, action, mode } = body;

  if (!callConfig) {
    return NextResponse.json({ error: "callConfig is required" }, { status: 400 });
  }

  if (action === "start") {
    const openingLine = body.openingLine ?? buildOpeningLine(callConfig);
    const session = createSession(callConfig, openingLine, mode ?? "stt");
    return NextResponse.json({ session });
  }

  if (action === "respond") {
    if (!body.session || !body.patientText) {
      return NextResponse.json({ error: "session and patientText required" }, { status: 400 });
    }
    const session = await handlePatientResponse(callConfig, body.session, body.patientText);
    // Keep store in sync so operator monitor and /client can both see state
    updateSession(session);
    return NextResponse.json({ session });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

function buildOpeningLine(config: CallConfig): string {
  const address = parseAddressFrom(
    config.patient.context,
    config.patient.displayName,
    config.assistant.language
  );
  const name = config.assistant.name || "Nisha";
  const isHinglish = /hindi|hinglish/i.test(config.assistant.language);

  if (isHinglish) {
    return `[happy] Namaste ${address}, main ${name} bol rahi hoon Apollo Hospital se. Aap kaisi feel kar rahe hain aaj?`;
  }
  return `[happy] Hello ${address}, this is ${name} calling from Apollo Hospital. How are you feeling today?`;
}
