---
name: silk-voice
description: Work with Rumik Silk text-to-speech models, especially Mulberry 1.5 and Muga. Use when writing Silk prompts, choosing a Silk model, building voice agents, debugging Silk TTS output, or creating Hinglish/emotional voice scripts for Cocoon.
---

# Silk Voice

## Quick start

Use this skill when a feature needs Rumik Silk TTS. For Cocoon, default to:

- **Mulberry 1.5** for fast realtime turns and multi-speaker voice-agent flow
- **Muga** for the emotional moments: warm greeting, reassurance, concern, escalation handoff
- **Spider** only as future context; do not depend on it for the hackathon demo

## Model picker

| Need | Model | Why |
|---|---|---|
| Low-latency call turns | Mulberry 1.5 | Fast, flexible, multi-speaker, good for realtime agents |
| Expressive Hinglish emotion | Muga | Strong paragraph-level tone and inline events |
| Largest / highest-capacity model | Spider | Out of scope for today's build |

## Voice-agent pipeline

Use the hackathon pipeline shape:

1. **STT:** Deepgram transcribes the patient response
2. **LLM:** Gemini decides the next assistant turn from patient context + care script
3. **TTS:** Silk renders the assistant response

For demos, scenario buttons are acceptable before live STT. Do not let STT setup block the Silk voice experience.

## Prompting patterns

### Muga

Use Muga with explicit paragraph tone markers and sparse compatible events.

```text
[neutral] Namaste chachaji, main Cocoon se bol rahi hoon. Aapki surgery ke baad bas ek quick check-in karna tha. Aapki tabiyat ab kaisi hai?
```

Rules:
- Latin script only: `aap kaise hain`, not Devanagari
- One tone marker per paragraph: `[happy]`, `[excited]`, `[sad]`, `[angry]`, `[neutral]`, `[whisper]`
- Supported events only: `<laugh>`, `<chuckle>`, `<sigh>`
- Match event to tone: use `<sigh>` with `[sad]` or `[whisper]`; avoid `<laugh>` in serious care lines
- Keep utterances around 2-30 seconds; split anything longer than ~40 seconds
- Temperature `0.7` is the reliable default

### Mulberry 1.5

Use Mulberry with a short natural-language voice description plus transcript.

```text
Description: a warm 30s hindi accent female voice, conversational pacing, calm and reassuring, healthcare assistant.
Transcript: Namaste chachaji, main Cocoon se bol rahi hoon. Aapki tabiyat ab kaisi hai?
```

Rules:
- Keep the voice description short and concrete: 3-5 attributes
- Prefer healthcare roles like `healthcare_assistant`, `customer_support_agent`, or `virtual_receptionist`
- Use Indic accent descriptors when useful: `hindi`, `bengali`, `marathi`, `south_indian`, etc.
- Use inline tags only when they help the performance: `<sigh>`, `<chuckle>`, `<curious>`, `<whisper>`, `<excited>`

## Healthcare guardrails

For Cocoon prompts:

- Do not diagnose
- Do not claim the assistant is a doctor
- Ask simple follow-up questions
- Escalate concerning symptoms instead of giving treatment advice
- Use calm wording for urgent handoff: serious, not panicked
- Prefer patient-friendly words over medical jargon
- Use relationship terms only if present in patient context

## Keys hygiene

Never write shared hackathon keys into source, docs, screenshots, or commits.

Use local environment variables:

```text
DEEPGRAM_API_KEY=
GEMINI_API_KEY=
SILK_API_KEY=
SILK_BASE_URL=
```

## Checks before shipping a Silk prompt

- Is the text Latin script?
- Is the model choice intentional?
- For Muga: exactly one valid `[tone]` per paragraph?
- For Muga: are events compatible with tone?
- Is the utterance short enough?
- Is the clinical wording bounded and safe?
- Does the fallback still work if Silk generation fails?

## References

- See [REFERENCE.md](REFERENCE.md) for full model prompting rules.
- See [EXAMPLES.md](EXAMPLES.md) for Cocoon-ready healthcare prompts.
