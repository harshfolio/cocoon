export type CallState = "idle" | "ready" | "calling" | "speaking" | "listening" | "thinking" | "fallback" | "escalated" | "completed";

export type Scenario = {
  id: string;
  patientName: string;
  relationshipTerm: string;
  age: number;
  primaryCondition: string;
  encounterSummary: string;
  language: string;
  tone: string;
  medications: string[];
  riskLevel: "low" | "medium" | "high";
  lastAssistantLine: string;
  summary: string;
  escalationReason?: string;
  state: CallState;
};

export const mockScenarios: Scenario[] = [
  {
    id: "diabetic-post-surgery",
    patientName: "Rajesh Verma",
    relationshipTerm: "Chachaji",
    age: 61,
    primaryCondition: "Type 2 diabetes + post-knee surgery recovery",
    encounterSummary: "Day 2 after knee surgery discharge. Need medication adherence, pain check, and wound symptom follow-up.",
    language: "Hindi / Hinglish",
    tone: "Warm, steady, reassuring",
    medications: ["Metformin 500mg", "Antibiotic AM/PM", "Painkiller after meals"],
    riskLevel: "medium",
    lastAssistantLine: "Namaste Chachaji, main Cocoon se bol rahi hoon. Aapki tabiyat aaj kaisi hai?",
    summary: "Primary hackathon story. Combines chronic-care adherence with post-surgical symptom tracking.",
    escalationReason: "Missed antibiotic doses + rising pain or bleeding should trigger doctor callback.",
    state: "ready"
  },
  {
    id: "bp-follow-up",
    patientName: "Seema Nair",
    relationshipTerm: "Seema ji",
    age: 48,
    primaryCondition: "Hypertension follow-up",
    encounterSummary: "Three-day check-in after medication change. Confirm BP meds started and dizziness improved.",
    language: "Hinglish",
    tone: "Conversational, respectful",
    medications: ["Amlodipine 5mg", "Telmisartan 40mg"],
    riskLevel: "low",
    lastAssistantLine: "Seema ji, aaj dizziness ya weakness kam hua kya?",
    summary: "Lower-risk chronic-care story that shows routine adherence and reassurance.",
    state: "listening"
  },
  {
    id: "thyroid-follow-up",
    patientName: "Ananya Dutta",
    relationshipTerm: "Ananya",
    age: 33,
    primaryCondition: "Thyroid medication follow-up",
    encounterSummary: "Post-appointment check to confirm medicine start and symptom changes after dosage adjustment.",
    language: "English fallback",
    tone: "Calm, precise",
    medications: ["Levothyroxine 75mcg"],
    riskLevel: "low",
    lastAssistantLine: "Checking in after your dosage update — did you begin the new thyroid medicine?",
    summary: "Fallback language path for demos where English lands better.",
    state: "thinking"
  }
];
