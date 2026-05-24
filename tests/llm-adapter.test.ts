import assert from "node:assert/strict";
import test from "node:test";
import { createLlmClient } from "@/lib/llm/adapter";
import { createSession } from "@/lib/conversation/session";
import { getRajeshPreset } from "@/lib/config/presets";

const config = getRajeshPreset();
const openingLine = "[happy] Namaste test";

test("createLlmClient defaults to openai client", () => {
  delete process.env.LLM_PROVIDER;
  const client = createLlmClient();
  assert.strictEqual(client.provider, "openai");
});

test("createLlmClient selects gemini client when configured", () => {
  process.env.LLM_PROVIDER = "gemini";
  const client = createLlmClient();
  assert.strictEqual(client.provider, "gemini");
  delete process.env.LLM_PROVIDER;
});

test("gemini stub returns escalation when symptoms are severe", async () => {
  process.env.LLM_PROVIDER = "gemini";
  const client = createLlmClient();
  const session = createSession(config, openingLine);
  const decision = await client.generateAssistantTurn({
    callConfig: config,
    session,
    patientText: "I have fever and blood from the wound"
  });

  assert.strictEqual(decision.escalation.active, true);
  assert.strictEqual(decision.escalation.concernLevel, "high");
  delete process.env.LLM_PROVIDER;
});
