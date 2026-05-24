import assert from "node:assert/strict";
import test from "node:test";
import { loadScenarioById, loadScenarioBySlug, listScenarios } from "@/lib/scenarios/load-scenario";

test("loadScenarioBySlug returns correct scenario", () => {
  const scenario = loadScenarioBySlug("diabetic-post-surgery");
  assert.ok(scenario);
  assert.strictEqual(scenario.id, "scenario-rajesh-diabetic-post-surgery");
  assert.strictEqual(scenario.patient.preferredLanguage, "hindi-hinglish");
});

test("loadScenarioById returns correct scenario", () => {
  const scenario = loadScenarioById("scenario-rajesh-diabetic-post-surgery");
  assert.ok(scenario);
  assert.strictEqual(scenario.slug, "diabetic-post-surgery");
  assert.strictEqual(scenario.medications.length, 3);
});

test("loadScenarioBySlug returns null for unknown slug", () => {
  const scenario = loadScenarioBySlug("unknown-slug");
  assert.strictEqual(scenario, null);
});

test("listScenarios returns both sample scenarios", () => {
  const all = listScenarios();
  assert.strictEqual(all.length, 2);
  assert.ok(all.every((scenario) => scenario.patient.fullName.length > 0));
  assert.ok(all.every((scenario) => scenario.escalationThresholds.length >= 1));
});