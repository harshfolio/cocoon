---
date: 2026-05-24
type: demo-script
status: draft
audience: hackathon-judges
duration: 4-5 minutes
---

# Cocoon — Demo Script

## The one-line pitch

Cocoon calls patients after surgery instead of waiting for them to call the hospital.

---

## Opening (30 seconds)

> "Every year, thousands of patients go home after surgery and the hospital loses track of them. Not because nobody cares — because there's no system. The nurse is stretched. The patient doesn't know if their pain is normal. So they wait. And sometimes waiting is the wrong call."

> "Cocoon flips this. Instead of waiting for the patient to reach out, Cocoon calls them first — in their language, using their name, knowing exactly what they had done and what meds they're on."

> "This is the Rumik × AWS hackathon and we built Cocoon on top of Deepgram for speech, Gemini for reasoning, and Silk for voice. Let me show you."

---

## Scenario 1 — Rajesh Verma (2 minutes)
**Persona:** Rajesh Chachaji, 61, diabetic, two days post knee surgery. He's home. He feels okay but hasn't told anyone his pain is climbing.

**Narration before playing:**
> "Rajesh Verma is 61. He had knee surgery two days ago. He also has Type 2 diabetes, so medication timing matters. He's sitting at home. No one has called him."

**[Click scenario card: Rajesh "Chachaji" | Click "Call me"]**

The call starts. Silk Muga voice, warm:

> *"Namaste Chachaji, main Cocoon se bol rahi hoon. Aapki surgery ke do din ho gaye — bas check karna tha, aap kaise feel kar rahe hain?"*

**[Patient responds: "Theek hoon, thoda dard hai"]**

Cocoon asks about medication timing. He says he took the morning antibiotic but forgot the evening painkiller.

Cocoon: *"Samajh gayi Chachaji. Dawai time pe lena zaruri hai — antibiotic especially. Aur ghutne mein dard kitna hai, ek se das mein?"*

He says seven.

**[Operator panel escalation card fires: medium concern — elevated pain + missed dose]**

> "Watch the right panel. Cocoon heard 'seven' and cross-referenced his care plan. Elevated pain on day two post-surgery plus a missed painkiller. Medium concern. It flags this for the care coordinator without telling Chachaji to panic."

Cocoon, calm: *"Theek hai Chachaji, main aaj ka update doctor ke saath share kar deti hoon. Aap tension mat lijiye — aap sahi jagah hain. Kal fir call aayegi."*

> "He doesn't know he just got triaged. He thinks someone checked in. That's the experience."

---

## Scenario 2 — Seema Nair (1.5 minutes)
**Persona:** Seema ji, 48, hypertension, medication changed 3 days ago. Lower stakes, different language register.

**Narration:**
> "Different patient. Different condition. Same product."

**[Click scenario: Seema Nair | Click "Call me"]**

Silk voice, slightly different register — Hinglish, conversational, respectful:

> *"Hello Seema ji, main Cocoon se bol rahi hoon. Aapki BP ki dawai teen din pehle change hui thi — bas check karna tha, koi side-effect ya discomfort toh nahi?"*

She says she's fine, took both doses.

Cocoon closes warmly. No escalation. Operator panel shows: completed, no flags.

> "Smooth recovery. Thirty seconds. No doctor time spent. Now multiply this by a hundred patients a week."

---

## The escalation moment — optional scenario 3 (45 seconds)
*Use this if time allows or if judges want to see a high-urgency path.*

> "Let me show you what happens when something actually is wrong."

**[Load Ananya Dutta | manipulate to high-risk response]**

Patient reports dizziness and hasn't taken levothyroxine in two days.

Cocoon: *"I hear you. Dizziness with missed thyroid medication for two days — I'm flagging this for your doctor right now as high priority. Please stay comfortable and don't take any extra doses. Your care team will call you shortly."*

**[Operator panel: High concern — 2 missed doses + dizziness. Recommended action: contact doctor immediately.]**

> "The voice stays calm. The patient doesn't feel like it's an emergency. But the clinic knows exactly what happened."

---

## Closing — 30 seconds

> "What you just saw: three patients, three conditions, one product that knows who it's calling and why."

> "The voice is Silk — Muga for the emotional moments, Mulberry for the realtime turns. The reasoning is Gemini. The ears are Deepgram. And the stack runs fully in a browser today — no telephony setup needed for the demo."

> "The long game: every hospital discharge generates a follow-up call automatically. Chronic care patients get checked in weekly. Elderly patients' families get a summary. The system knows when to close the loop and when to ring a doctor."

> "We called it Cocoon because recovery should feel protected. Right now it doesn't. That's what we're fixing."

---

## Operator panel talking points
*(Say these while the panel is visible, not as a separate section)*

- Left card: patient name, condition, medications, language, risk level
- Center: live conversation timeline — what Cocoon said, what the patient said, which model rendered each turn
- Right: escalation card — reason, urgency tier (low / medium / high), recommended next action
- "A clinician looking at this dashboard sees the whole call in 10 seconds."

---

## If STT isn't working
Use operator response buttons. Do not mention the fallback. Keep talking through the narrative while clicking. The voice experience still lands.

---

## If asked about production

> "Today this runs in a browser. The next step is real outbound calls via a SIP trunk — the conversation engine and escalation logic don't change. We've designed the patient-memory model to plug into a hospital's discharge data with one integration point."

---

## Key facts to have ready

| Thing | Detail |
|---|---|
| Voice models | Muga for emotional turns, Mulberry 1.5 for routine turns |
| STT | Deepgram, Hindi/Hinglish |
| LLM | Gemini, provider-agnostic adapter |
| Deployment | Browser demo, AWS-ready |
| Escalation tiers | Low / Medium / High concern |
| Primary scenario | Rajesh Verma — diabetic, post-knee-surgery, day 2 |
| Languages | Hinglish (primary), English (fallback) |
| What Cocoon does NOT do | Diagnose, give treatment advice, replace a doctor |

---

## The one thing judges should remember

> Cocoon calls first. In the patient's language. And it knows when to get a doctor.
