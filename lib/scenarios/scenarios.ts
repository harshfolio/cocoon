import { Scenario } from "@/lib/domain/types";

export const scenarios: Scenario[] = [
  {
    id: "scenario-rajesh-diabetic-post-surgery",
    slug: "diabetic-post-surgery",
    title: "Rajesh — diabetic post-surgery follow-up",
    summary: "Primary hackathon story blending medication adherence, pain check, and surgery recovery.",
    patient: {
      id: "patient-rajesh-verma",
      fullName: "Rajesh Verma",
      relationshipTerm: "Chachaji",
      age: 61,
      preferredLanguage: "hindi-hinglish",
      primaryConditions: ["Type 2 diabetes", "Post-knee surgery recovery"]
    },
    medications: [
      { name: "Metformin", dosage: "500mg", scheduleHint: "after breakfast and dinner", adherencePriority: "medium" },
      { name: "Antibiotic", dosage: "AM/PM", scheduleHint: "complete the full course", adherencePriority: "high" },
      { name: "Painkiller", dosage: "after meals", scheduleHint: "as prescribed for discomfort", adherencePriority: "medium" }
    ],
    encounter: {
      encounterId: "enc-knee-surgery-day-2",
      encounterType: "post-surgery",
      summary: "Day 2 after discharge from knee surgery with diabetes-related wound-healing concern.",
      daysSinceEncounter: 2,
      symptomChecklist: ["pain", "swelling", "bleeding", "fever", "dizziness"]
    },
    escalationThresholds: [
      {
        id: "missed-antibiotic-plus-pain",
        trigger: "Missed antibiotic doses + rising pain or bleeding",
        concernLevel: "high",
        recommendedAction: "Contact doctor immediately"
      },
      {
        id: "mild-pain",
        trigger: "Mild pain without bleeding",
        concernLevel: "medium",
        recommendedAction: "Call back within 24h"
      }
    ],
    voice: {
      languageLabel: "Hindi / Hinglish",
      tone: "Warm, steady, reassuring",
      emotionalModel: "muga",
      routineModel: "muga"
    },
    openingLine: "[happy] Namaste Chachaji, main Cocoon se bol rahi hoon. Aapki surgery ke baad aaj tabiyat kaisi lag rahi hai?"
  },
  {
    id: "scenario-seema-hypertension",
    slug: "bp-follow-up",
    title: "Seema — hypertension medication check-in",
    summary: "Routine chronic-care check for medication start and dizziness improvement.",
    patient: {
      id: "patient-seema-nair",
      fullName: "Seema Nair",
      relationshipTerm: "Seema ji",
      age: 48,
      preferredLanguage: "hindi-hinglish",
      primaryConditions: ["Hypertension"]
    },
    medications: [
      { name: "Amlodipine", dosage: "5mg", scheduleHint: "morning after breakfast", adherencePriority: "medium" },
      { name: "Telmisartan", dosage: "40mg", scheduleHint: "same time daily", adherencePriority: "medium" }
    ],
    encounter: {
      encounterId: "enc-med-change-day-3",
      encounterType: "chronic-care",
      summary: "Three-day check after medication change to confirm adherence and symptom relief.",
      daysSinceEncounter: 3,
      symptomChecklist: ["dizziness", "weakness", "headache"]
    },
    escalationThresholds: [
      {
        id: "bp-dizziness-persistent",
        trigger: "Persistent dizziness after starting medication",
        concernLevel: "medium",
        recommendedAction: "Nurse callback within 24h"
      }
    ],
    voice: {
      languageLabel: "Hinglish",
      tone: "Conversational, respectful",
      emotionalModel: "muga",
      routineModel: "muga"
    },
    openingLine: "[happy] Seema ji, bas ek quick follow-up call thi. Aaj dizziness ya weakness mein koi farq mehsoos hua?"
  }
];
