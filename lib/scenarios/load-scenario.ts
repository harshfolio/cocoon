import { Scenario } from "@/lib/domain/types";
import { scenarios } from "@/lib/scenarios/scenarios";

export function listScenarios(): Scenario[] {
  return scenarios;
}

export function loadScenarioBySlug(slug: string): Scenario | null {
  return scenarios.find((scenario) => scenario.slug === slug) ?? null;
}

export function loadScenarioById(id: string): Scenario | null {
  return scenarios.find((scenario) => scenario.id === id) ?? null;
}
