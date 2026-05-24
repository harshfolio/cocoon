/**
 * File-backed demo call store.
 * Next dev / route handlers may run in separate module contexts, so process memory
 * is not reliable for cross-device shared state.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { CallRecord, ClinicRecord, CallConfig, ConversationSession, PatientStatus } from "@/lib/domain/types";
import { parseAddressFrom } from "@/lib/utils/parse-context";
import { getHarshPreset, getRajeshPreset, getSeemaPreset } from "@/lib/config/presets";

const STORE_PATH = path.join(os.tmpdir(), "cocoon-demo-call-store.json");

function readStore(): { activeCall: CallRecord | null } {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { activeCall: null };
  }
}

function writeStore(data: { activeCall: CallRecord | null }): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data), "utf-8");
}

export function startCall(config: CallConfig, session: ConversationSession): CallRecord {
  const record: CallRecord = {
    id: `call-${Date.now()}`,
    patientName: parseAddressFrom(config.patient.context, config.patient.displayName, config.assistant.language),
    patientContext: config.patient.context,
    callConfig: config,
    session,
    status: "in-call",
    summary: null,
    startedAt: Date.now(),
    endedAt: null,
  };
  writeStore({ activeCall: record });
  return record;
}

export function updateSession(session: ConversationSession): void {
  const store = readStore();
  if (!store.activeCall) return;
  store.activeCall = { ...store.activeCall, session };
  writeStore(store);
}

export function endCall(status: PatientStatus, summary: string | null = null): void {
  const store = readStore();
  if (!store.activeCall) return;
  const finished: CallRecord = {
    ...store.activeCall,
    status,
    summary,
    endedAt: Date.now(),
    session: store.activeCall.session,
  };
  writeStore({ activeCall: null });

  // Prepend to clinic history
  clinicHistory.unshift({
    id: finished.id,
    patientName: finished.patientName,
    context: finished.patientContext.split("\n").slice(0, 2).join(" · ").slice(0, 80),
    status: finished.status,
    summary: finished.summary,
    lastContactAt: finished.endedAt,
    callConfig: finished.callConfig,
  });
}

export function updateSummary(summary: string): void {
  if (clinicHistory[0]) {
    clinicHistory[0] = { ...clinicHistory[0], summary };
  }
}

export function getActiveCall(): CallRecord | null {
  return readStore().activeCall;
}

// ─── Clinic history — seeded for demo ────────────────────────────────────────
//
// Shows a realistic clinic state before the live demo call:
//   • Harsh  → pending (the live demo — operator calls this next)
//   • Seema  → completed (clean close, good outcome to show)
//   • Rajesh → escalated (shows escalation badge/summary)
//   • Priya  → pending  (extra pending to show queue depth)

const harsh  = getHarshPreset();
const seema  = getSeemaPreset();
const rajesh = getRajeshPreset();

export const clinicHistory: ClinicRecord[] = [
  {
    id: "demo-harsh",
    patientName: "Harsh Sharma",
    context: "Hypertension · Day 5 · First prescription",
    status: "pending",
    summary: null,
    lastContactAt: null,
    callConfig: harsh,
  },
  {
    id: "demo-seema",
    patientName: "Seema Nair",
    context: "Hypertension · Day 3 medication check",
    status: "completed",
    summary: "Amlodipine and Telmisartan taken on time. Dizziness reduced significantly. No new symptoms. Follow-up in 4 days.",
    lastContactAt: Date.now() - 5 * 60 * 60 * 1000, // 5h ago
  },
  {
    id: "demo-rajesh",
    patientName: "Rajesh Verma",
    context: "Post knee surgery · Day 2 · Diabetes",
    status: "escalated",
    summary: "Patient reported pain 8/10 and swelling at incision site. Doctor callback queued immediately.",
    lastContactAt: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
  },
  {
    id: "demo-priya",
    patientName: "Priya Menon",
    context: "Hypertension · Day 7 new medication",
    status: "pending",
    summary: null,
    lastContactAt: null,
    callConfig: {
      ...rajesh,
      patient: {
        displayName: "Priya Menon",
        context: `Name: Priya Menon, 52F\nAddress as: Priya ji\nCondition: Hypertension, Day 7 on Losartan\nMedications:\n  - Losartan 50mg once daily (morning)\nCall goal: Check adherence, ask about headaches or dizziness\nEscalate if: severe headache, chest pain, BP above 180`,
      },
      assistant: { ...seema.assistant },
      systemPrompt: seema.systemPrompt,
    },
  },
];

export function getClinicRecords(): ClinicRecord[] {
  return clinicHistory;
}
