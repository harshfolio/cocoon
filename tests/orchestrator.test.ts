import assert from "node:assert/strict";
import test from "node:test";
import { handlePatientResponse } from "@/lib/conversation/orchestrator";
import { createSession } from "@/lib/conversation/session";
import { getRajeshPreset } from "@/lib/config/presets";

const config = getRajeshPreset();
const openingLine = "[happy] Namaste Chachaji, main Nisha bol rahi hoon. Aaj tabiyat kaisi hai?";

test("session opens with parsed patient address as display name", () => {
  const session = createSession(config, openingLine);
  // "Address as: Chachaji" in Rajesh preset → parsed to "Chachaji"
  assert.strictEqual(session.patientDisplayName, "Chachaji");
  assert.strictEqual(session.lastAssistantLine, openingLine);
  assert.strictEqual(session.transcript.length, 1);
  assert.strictEqual(session.escalation.active, false);
});

test("handlePatientResponse escalates severe symptoms", async () => {
  const session = createSession(config, openingLine, "fallback");
  const updated = await handlePatientResponse(config, session, "bahut dard hai aur bleeding bhi ho rahi hai");

  assert.strictEqual(updated.state, "escalated");
  assert.strictEqual(updated.escalation.active, true);
  assert.strictEqual(updated.escalation.concernLevel, "high");
});

test("handlePatientResponse keeps non-risky answers in conversation", async () => {
  const session = createSession(config, openingLine, "fallback");
  const updated = await handlePatientResponse(config, session, "haan dawai le li aur pain kam hai");

  assert.strictEqual(updated.state, "speaking");
  assert.strictEqual(updated.escalation.active, false);
  assert.ok(updated.transcript.length >= 3);
});
