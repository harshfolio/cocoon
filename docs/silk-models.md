# Silk Models

Silk is Rumik's TTS family for fast, expressive, Indic-language voice.

## Model family

### Mulberry 1.5

Use this when the priority is speed and realtime conversation.

Strengths:

- very fast
- good for multi-speaker flows
- works well for live voice-agent turns
- suitable for routine call logic

Best Cocoon use:

- standard follow-up questions
- short acknowledgments
- fallback IVR-style turns
- any turn where latency matters more than drama

### Muga

Use this when the line needs emotion and personality.

Strengths:

- expressive Hinglish speech
- paragraph-level tone control
- inline laugh / sigh / chuckle events
- natural-sounding warmth for care flows

Best Cocoon use:

- opening greeting
- concern / empathy
- reassurance
- escalation handoff

### Spider

The largest model in the family.

Status for the hackathon:

- out of scope for today
- useful only as future roadmap context

## Prompting rules to remember

- Use Latin script only
- Keep prompts short and spoken
- For Muga, use a single tone marker per paragraph
- For Muga, keep events compatible with tone
- For Mulberry, describe the voice in one short natural-language sentence
- Keep healthcare wording simple and bounded

## Recommended default for Cocoon

- **Mulberry 1.5** for realtime turns and operational flow
- **Muga** for the highest-impact emotional lines

## Example mapping

- Warm greeting: Muga
- Routine medication check: Mulberry 1.5 or Muga
- Reassurance after discomfort: Muga
- Doctor escalation handoff: Muga or Mulberry 1.5
- Multi-turn fallback logic: Mulberry 1.5
