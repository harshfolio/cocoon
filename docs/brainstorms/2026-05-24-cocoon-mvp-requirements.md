---
date: 2026-05-24
topic: cocoon-mvp-requirements
---

# Cocoon — Hackathon MVP Requirements

## Summary

Cocoon is a browser-based AI voice agent that proactively calls patients, checks on their medication adherence and symptoms, and escalates to a doctor when something sounds off. The hackathon MVP demonstrates this with 2-3 patient scenarios — anchored on a diabetic post-surgical patient — using Silk 1 for emotionally warm, multilingual voice output and live STT for two-way conversation.

---

## Problem Frame

Patients in India (and broadly) rarely proactively call their doctor after surgery, discharge, or a chronic care consultation — even when confused about medications, experiencing symptoms, or missing doses. The burden of follow-up falls on already-stretched healthcare staff, and most follow-up doesn't happen at all.

For chronic conditions like diabetes, hypertension, and thyroid disorders, adherence gaps compound over time. A missed dose or untracked symptom in week one can mean a hospitalization in week four. The problem is not patient unwillingness — it is friction: language barriers, hesitation to "bother" the doctor, forgetting, and no one checking in.

Cocoon flips the model: the assistant calls the patient first, in their language, using their name, with context about their condition and care plan. It checks in, asks the right questions, and surfaces risk before it escalates.

---

## Actors

- A1. **Patient**: Receives the outbound call; speaks naturally in Hindi, Hinglish, or English; responds to questions about symptoms, medications, and wellbeing.
- A2. **Operator / Demo Runner**: Initiates the call via a "Call me" button; monitors conversation state, patient context, and escalation outcome in the operator panel.
- A3. **Cocoon AI Agent**: Drives the outbound call; generates context-aware, emotionally appropriate responses via LLM; speaks via Silk 1 TTS; listens via STT.
- A4. **Doctor / Clinician (implicit)**: Not present in the demo loop; receives escalation flag as an output — the "human who acts next."

---

## Key Flows

- F1. **Outbound call initiation**
  - **Trigger:** Operator clicks "Call me" button for a selected patient scenario
  - **Actors:** A2, A3
  - **Steps:** Patient scenario loads with pre-seeded context (name, condition, medications, language preference, last encounter). Cocoon initiates the simulated call. Silk TTS renders an opening greeting ("Hello Chachaji, kaise hain aap?"). STT activates to capture patient response.
  - **Outcome:** A two-way voice conversation is live; operator panel shows patient context and conversation state
  - **Covered by:** R1, R2, R3, R4, R8

- F2. **Two-way conversation loop**
  - **Trigger:** Patient responds to a Cocoon prompt (via STT or, as fallback, operator button)
  - **Actors:** A1, A3
  - **Steps:** STT transcribes patient speech. LLM processes response in context of patient profile, prior conversation turns, and care plan. LLM generates next prompt (question, acknowledgment, or concern flag). Silk TTS renders response in configured language/tone. Loop continues until conversation end or escalation.
  - **Outcome:** Conversation advances naturally; operator panel reflects each turn in real-time
  - **Covered by:** R3, R5, R6, R7, R9

- F3. **Escalation trigger**
  - **Trigger:** LLM detects a concerning response — missed doses over multiple days, reported pain, bleeding, or a symptom flagged in the patient's care plan
  - **Actors:** A3, A2, A4 (implicit)
  - **Steps:** LLM sets escalation flag with reason. Conversation acknowledges concern warmly ("Main aapke doctor ko bataunga, aap fikr mat karo"). Operator panel surfaces escalation card with reason, urgency level, and recommended action. Call concludes or hands off.
  - **Outcome:** Escalation is visible to the operator; a clinician can act on it
  - **Covered by:** R10, R11, R12

- F4. **STT fallback**
  - **Trigger:** STT fails to initialize, times out, or produces low-confidence output
  - **Actors:** A2, A3
  - **Steps:** System detects STT failure. Operator panel surfaces response-option buttons ("Haan, le li", "Nahi li", "Dard ho raha hai", etc.). Operator selects the patient's response. Conversation loop continues as normal.
  - **Outcome:** Demo continues without interruption; STT failure is non-fatal
  - **Covered by:** R8, R13

---

## Requirements

**Patient context and scenario**

- R1. Each patient scenario must carry: name, preferred language, relationship term (e.g., "Chachaji"), primary condition(s), current medications with dosage, last procedure or appointment, escalation thresholds, and conversation tone hints.
- R2. The MVP must include at least 2 scenarios; the primary scenario is a diabetic patient recovering from surgery, combining chronic adherence and post-surgical symptom checks.
- R3. Patient context must be available to the LLM at conversation start and persist across all turns in a session.

**Conversation and LLM layer**

- R4. Cocoon must initiate the call with a warm, personalized greeting using the patient's name and relationship term in the configured language.
- R5. The LLM must drive conversation turn-by-turn using patient context + full conversation history as input; it must not rely on scripted branches as the primary control flow.
- R6. The LLM must be prompted to check: (a) medication adherence, (b) symptom presence (pain, bleeding, fever, or condition-specific flags), and (c) general wellbeing — in that logical order, adapting based on patient responses.
- R7. Language is configurable per scenario. For the hackathon demo, Hindi and Hinglish are primary; English is the fallback. LLM output must match the configured language register.
- R8. The system must support two patient response input modes: (a) live STT as primary, (b) operator-button selection as fallback. Mode may be toggled per session.

**Voice — Silk 1 integration**

- R9. All Cocoon speech must be rendered via Silk 1 TTS API. Prompt construction must include emotional tone tags (warmth, concern, reassurance, urgency) appropriate to the conversation state.
- R10. When STT is active, Silk must not overlap with incoming patient speech — there must be a clear listen/speak state separation.

**Escalation**

- R11. When the LLM determines escalation is warranted, it must: (a) respond to the patient empathetically without causing alarm, (b) set an escalation record with reason and urgency level, and (c) surface this to the operator panel.
- R12. Escalation must not be binary — the system must distinguish at minimum: low concern (note for next visit), medium concern (call back within 24h), high concern (contact doctor now).

**Operator panel**

- R13. The operator panel must show in real-time: patient summary (name, condition, meds, language), live conversation transcript, current conversation state, and escalation status.
- R14. When in fallback mode, the operator panel must surface response-option buttons that match the current conversation step.

**Resilience**

- R15. If Silk TTS fails, the system must surface the text of the intended utterance in the operator panel and allow the demo to continue in text-only mode.
- R16. If STT fails or times out, the system must silently fall back to operator-button mode without crashing or requiring a page reload.

---

## Acceptance Examples

- AE1. **Covers R4, R7.** Given a scenario configured for Hindi with relationship term "Chachaji", when the call initiates, Cocoon's first utterance is "Hello Chachaji, kaise hain aap?" rendered via Silk TTS in a warm tone.

- AE2. **Covers R5, R6.** Given a patient who reports taking their medication when asked, when the LLM receives that response, it does not re-ask the medication question — it advances to symptoms or wellbeing in the next turn.

- AE3. **Covers R11, R12.** Given a patient who reports chest pain and two missed doses, when the LLM processes this, it responds empathetically ("Aap fikr mat karo, main aapke doctor ko abhi inform kar raha hoon"), sets escalation level to "high concern", and the operator panel surfaces an escalation card with reason "chest pain + 2 missed doses" and recommended action "contact doctor immediately."

- AE4. **Covers R8, R16.** Given STT initialization fails at session start, when the call begins, the operator panel silently surfaces response-option buttons and the demo continues — no error dialog, no page reload required.

- AE5. **Covers R3.** Given a patient with diabetes and a recent knee surgery, when the LLM generates its first symptom question, it references the surgical context ("Aapke ghutne mein dard toh nahi hai?") rather than asking a generic question.

---

## Success Criteria

- A judge with no briefing can understand the patient context, conversation flow, and escalation outcome from the UI alone within 60 seconds.
- At least 2 scenarios run end-to-end without operator intervention when STT is working.
- At least 1 scenario demonstrates a clear escalation path with a reason visible in the operator panel.
- Silk's voice quality and emotional range are perceptibly differentiated — warmth in the greeting, concern during symptom flagging, reassurance on escalation.
- The fallback path (operator buttons) allows the demo to complete even if STT is unavailable.
- A planner reading this document does not need to invent any patient behavior, escalation logic, or language handling — those decisions are made here.

---

## Scope Boundaries

### Deferred for later

- Real PSTN/SIP telephony — the MVP simulates a call in the browser
- Persistent patient history across multiple sessions (memory is seeded per scenario for the hackathon)
- Bengali or other languages beyond Hindi/Hinglish for the MVP
- Hospital EMR/EHR integration
- Scheduling, retry logic, and missed-call handling
- HIPAA-grade storage, auth, and auditability
- Post-appointment follow-up, physiotherapy, dental, and therapy-specific flows (valid long-term use cases, not in scope for the demo)
- Family / caregiver alert layer (strong long-term play, deferred)
- Clinician-facing queue and workflow beyond the simple escalation card

### Outside this product's identity

- Diagnosis generation — Cocoon follows up, it does not diagnose
- Autonomous medical advice beyond guided, care-plan-aligned follow-up
- Emergency triage replacement — if a patient is in acute distress, Cocoon escalates; it does not manage emergencies
- Inbound patient-initiated chat or messaging — Cocoon is outbound voice, not a chatbot

---

## Key Decisions

- **Chronic care + surgical as primary demo scenario**: A diabetic post-surgical patient hits both axes simultaneously, making escalation logic more compelling and the memory/context angle more credible than either framing alone.
- **LLM-driven conversation, not scripted FSM**: Handles natural patient language naturally; structured prompting keeps it safe and demo-predictable. Scripted branches would feel robotic and wouldn't showcase the intelligence.
- **STT primary, operator-button fallback**: Attempt live two-way voice for maximum demo impact; fall back gracefully without visible failure.
- **Silk 1 as partner integration**: Voice quality and multilingual emotional range must be foregrounded — it is part of the judging criteria, not just an implementation detail.
- **Hindi/Hinglish primary, English fallback**: One language pair done well is more credible than three done superficially.
- **Language configurable per scenario**: The system should be designed so swapping language is a scenario config change, not a code change — this sets up the long game correctly.

---

## Dependencies / Assumptions

- Silk 1 API access and credentials are available before implementation begins
- STT provider (e.g., Deepgram, Whisper, or Silk's own STT if available) must support Hindi/Hinglish or at minimum handle code-switching acceptably
- LLM provider (likely OpenAI or Anthropic) can produce fluent Hindi/Hinglish output with appropriate emotional register when prompted correctly
- The hackathon demo environment has a stable browser with microphone access for STT
- Patient scenario data will be hand-authored (not pulled from a real EHR) for the demo

---

## Outstanding Questions

### Resolve Before Planning

- [Affects R9][User decision] Does Silk 1 have its own STT API, or do we need a separate STT provider? This affects architecture at the voice layer — one integrated provider vs two.
- [Affects R7][User decision] What LLM provider and model are we using? Hindi/Hinglish quality varies significantly across providers.

### Deferred to Planning

- [Affects R8][Technical] How is STT silence/timeout detection handled — client-side VAD, server-side, or a fixed timeout?
- [Affects R9][Technical] What is the Silk 1 prompt format for injecting emotional tone tags — are these documented or do they need to be discovered from the API?
- [Affects R5][Technical] What is the maximum context window for the conversation history before it needs to be summarized or truncated?
