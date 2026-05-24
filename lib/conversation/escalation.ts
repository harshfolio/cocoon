import { EscalationState, Scenario } from "@/lib/domain/types";

const neutralEscalation: EscalationState = {
  active: false,
  concernLevel: null,
  reason: null,
  recommendedAction: null
};

export function buildNeutralEscalation(): EscalationState {
  return neutralEscalation;
}

export function inferEscalationFromPatientText(patientText: string, scenario: Scenario): EscalationState {
  const normalized = patientText.toLowerCase();

  if (
    normalized.includes("bleeding") ||
    normalized.includes("blood") ||
    normalized.includes("severe pain") ||
    normalized.includes("bahut dard") ||
    normalized.includes("fever")
  ) {
    const threshold = scenario.escalationThresholds[0];

    return {
      active: true,
      concernLevel: threshold?.concernLevel ?? "high",
      reason: threshold?.trigger ?? "Concerning symptoms reported",
      recommendedAction: threshold?.recommendedAction ?? "Contact doctor immediately"
    };
  }

  if (normalized.includes("missed") || normalized.includes("dose") || normalized.includes("did not take")) {
    const threshold = scenario.escalationThresholds.at(-1);

    return {
      active: true,
      concernLevel: threshold?.concernLevel ?? "medium",
      reason: threshold?.trigger ?? "Medication adherence issue reported",
      recommendedAction: threshold?.recommendedAction ?? "Call back within 24h"
    };
  }

  return buildNeutralEscalation();
}
