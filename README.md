# Cocoon

**AI-powered proactive follow-up calls for healthcare teams.**

Built at the Rumik × AWS Voice Hackathon - Delhi, May 2026.

---

## The problem

Patients go home after surgery or a diagnosis and the hospital loses track of them. Not because nobody cares - because there's no system. Nurses are stretched. Patients don't know if their symptoms are normal. So they wait. And sometimes waiting is the wrong call.

## What Cocoon does

Cocoon calls patients first - in their language, using their name, knowing exactly what they had done and what medications they're on. It checks in, listens for red flags, and alerts the care team when something needs attention. The patient thinks someone called to check on them. The clinic gets a triage signal without spending doctor time.

---

## Demo scenario

**Harsh Sharma, 28M** - Hypertension, Day 5 on first prescription (Telmisartan 40mg + Amlodipine 5mg).

Nisha from Apollo Hospital calls to confirm medications were taken and check for early side effects (dizziness, headache). The call takes under 90 seconds.

**Your responses:**
| Turn | Say |
|---|---|
| 1 | "Haan theek hoon, thoda better feel ho raha hai" |
| 2 | "Haan dono li hain, breakfast ke saath" |
| 3 | "Haan thoda dizziness hai" |

---

## Tech stack

| Layer | Technology |
|---|---|
| Voice (TTS) | [Rumik Silk](https://silk-api.rumik.ai) - Muga model, Hinglish, temperature 0.7 |
| Speech (STT) | [Deepgram](https://deepgram.com) - nova-3, Hindi, `speech_final` endpointing |
| Reasoning (LLM) | OpenAI GPT-4o-mini (scripted demo mode for zero-variance) |
| Frontend | Next.js 15 App Router, TypeScript |
| Audio | Web Audio API - PCM int16 streaming via WebSocket |

### Voice pipeline

```
Patient speaks
  → Deepgram STT (WebSocket, speech_final trigger)
  → LLM turn decision (parallel with Silk WS mint)
  → Silk Muga TTS (WebSocket PCM streaming)
  → AudioContext playback (~300ms to first audio chunk)
```

Latency optimisation: the Silk WebSocket session is minted in parallel with the LLM call, saving ~1.5s per turn. A speculative mint also fires during TTS playback so the next turn's session is warm before the patient starts speaking.

---

## Running locally

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.local .env
# Fill in: OPENAI_API_KEY, DEEPGRAM_API_KEY, SILK_API_KEY, SILK_BASE_URL

# Start dev server
npm run dev
```

Open `http://localhost:3000`. Press **Call me** on the Harsh preset. Speak when Nisha finishes her opening line.

---

## Architecture

```
/app
  /api/conversation     LLM turn handler (start + respond)
  /api/session/*        Call state (start, end, current)
  /api/silk             HTTP TTS proxy (streaming)
  /api/silk/ws-connect  Silk WebSocket session mint (keeps API key server-side)
  /api/stt/token        Deepgram token endpoint

/components
  /workspace            Operator dashboard (Call | Config | Clinic tabs)
  /call                 Live transcript panel (chat bubbles, escalation banner)
  /config               Config panel (Patient | Assistant | Prompt sub-tabs)
  /clinic               Patient queue with status and summaries

/lib
  /silk                 Silk TTS hook + WS streaming client
  /stt                  Deepgram STT hook (speech_final, mute/unmute)
  /llm                  LLM adapter (OpenAI + Gemini providers)
  /conversation         Orchestrator, session management
  /store                File-backed call store (cross-process shared state)
```

---

## Key design decisions

**Scripted demo mode** - The Harsh preset uses fixed responses instead of LLM output. Zero variance, zero risk of odd phrasing during the demo. Falls back to the LLM if the script runs out.

**Single browser tab** - No separate mobile client needed. The operator dashboard runs the full audio loop in the same tab. Press Call me, speak, hear Nisha respond.

**One audio pipeline** - All TTS goes through Silk WebSocket → PCM → AudioContext. No mixing of `new Audio()` blob playback with Web Audio (previously caused a voice-quality cutover bug mid-sentence).

**File-backed call store** - Next.js dev mode runs route handlers in separate module contexts, so in-memory singletons aren't shared. A JSON file in `os.tmpdir()` is the shared state layer for the demo.

---

## What Cocoon does not do

- Diagnose
- Prescribe or change treatment plans
- Replace a doctor or nurse
- Make outbound phone calls (demo uses browser audio - SIP integration is the next step)

---

## Built by

Harsh Sharma - [@harshsharma12021](https://github.com/harshsharma12021)
