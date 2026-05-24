// ─── Core domain types ──────────────────────────────────────────────────────

export type ConcernLevel = "low" | "medium" | "high";
export type SessionMode  = "stt" | "fallback";

export type SessionState =
  | "idle"
  | "ready"
  | "calling"
  | "speaking"
  | "listening"
  | "thinking"
  | "fallback"
  | "escalated"
  | "completed"
  | "error";

export type ConversationIntent =
  | "medication-check"
  | "symptom-check"
  | "wellbeing-check"
  | "reassurance"
  | "escalation"
  | "clarification";

// ─── Legacy Scenario shape (used as preset source only) ──────────────────────

export type PatientProfile = {
  id: string;
  fullName: string;
  relationshipTerm?: string;
  age: number;
  preferredLanguage: "hindi-hinglish" | "english";
  primaryConditions: string[];
};

export type MedicationPlan = {
  name: string;
  dosage: string;
  scheduleHint: string;
  adherencePriority: ConcernLevel;
};

export type EncounterContext = {
  encounterId: string;
  encounterType: "post-surgery" | "chronic-care" | "post-appointment";
  summary: string;
  daysSinceEncounter: number;
  symptomChecklist: string[];
};

export type EscalationThreshold = {
  id: string;
  trigger: string;
  concernLevel: ConcernLevel;
  recommendedAction: string;
};

export type ScenarioVoiceProfile = {
  languageLabel: string;
  tone: string;
  emotionalModel: "muga" | "mulberry";
  routineModel: "muga" | "mulberry";
};

export type Scenario = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  patient: PatientProfile;
  medications: MedicationPlan[];
  encounter: EncounterContext;
  escalationThresholds: EscalationThreshold[];
  voice: ScenarioVoiceProfile;
  openingLine: string;
};

// ─── CallConfig — what the dashboard produces ────────────────────────────────

export type VoiceModel = "muga" | "mulberry";
export type LlmModel   = "gpt-4o-mini" | "gpt-4o" | "gemini-3.1-flash-lite" | "gemini-2.0-flash-lite";
export type SttModel   = "nova-3";

export type AssistantConfig = {
  name: string;
  persona: string;       // freetext → injected into system prompt
  language: string;      // e.g. "Hindi / Hinglish"
  voiceModel: VoiceModel;
};

export type MedEntry = {
  id: string;
  name: string;
  dosage: string;
  priority: ConcernLevel;
};

export type PatientConfig = {
  // Single freetext block — user writes whatever context they have.
  // The LLM receives this verbatim in the runtime context section.
  context: string;
  // Derived display name (first line or explicit) — used in UI only
  displayName: string;
};

export type ModelConfig = {
  llmModel: LlmModel;
  temperature: number;
  maxTokens: number;
  sttModel: SttModel;
};

export type CallConfig = {
  assistant: AssistantConfig;
  systemPrompt: string;  // full editable prompt, verbatim to LLM
  patient: PatientConfig;
  model: ModelConfig;
  // Optional fixed script — responses used in order instead of calling the LLM.
  // Falls back to LLM once the script is exhausted. Ideal for safe demos.
  scriptedResponses?: string[];
};

// ─── Session types ────────────────────────────────────────────────────────────

export type TranscriptTurn = {
  id: string;
  speaker: "assistant" | "patient" | "system";
  text: string;
  mode?: SessionMode | "llm" | "tts";
};

export type EscalationState = {
  active: boolean;
  concernLevel: ConcernLevel | null;
  reason: string | null;
  recommendedAction: string | null;
};

export type ConversationSession = {
  id: string;
  scenarioId: string;
  patientDisplayName: string;
  relationshipTerm?: string;
  mode: SessionMode;
  state: SessionState;
  transcript: TranscriptTurn[];
  lastAssistantLine: string;
  escalation: EscalationState;
};

export type LlmDecision = {
  assistantText: string;
  nextIntent: ConversationIntent;
  escalation: EscalationState;
};

// ─── Clinic / call record types ──────────────────────────────────────────────

export type PatientStatus = "pending" | "in-call" | "completed" | "escalated";

export type CallRecord = {
  id: string;
  patientName: string;          // parsed from context
  patientContext: string;       // raw freetext context
  callConfig: CallConfig;
  session: ConversationSession | null;
  status: PatientStatus;
  summary: string | null;       // LLM-extracted on hangup
  startedAt: number;
  endedAt: number | null;
};

export type ClinicRecord = {
  id: string;
  patientName: string;
  context: string;              // short description for clinic list
  status: PatientStatus;
  summary: string | null;
  lastContactAt: number | null; // epoch ms, null = never called
  callConfig?: CallConfig;      // present for pending patients (to start a call)
};
