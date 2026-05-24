# Cocoon Hackathon Context

## Event

- **Rumik × AWS Voice Hackathon**
- **Date:** 24 May
- **Location:** Delhi
- **Theme:** build a voice agent that talks back

## Default pipeline

Every voice agent follows the same three-stage loop:

1. **Speech to text** - Deepgram transcribes the caller
2. **Brain** - Gemini decides the next response
3. **Text to speech** - Rumik Silk speaks the reply

For Cocoon, that means:

1. Patient or demo participant speaks
2. The assistant interprets the response in the context of the care plan
3. The assistant chooses the next follow-up question, reassurance, reminder, or escalation
4. Silk renders the response in the right tone and language

## What matters for the demo

- Show a proactive follow-up call, not a generic chat bot
- Make the assistant feel warm and human
- Show that the assistant can switch between routine check-in and concern/escalation
- Make the UI easy to understand in under a minute

## Provider roles

- **Deepgram** - STT
- **Gemini** - reasoning and turn selection
- **Rumik Silk** - TTS
- **AWS** - deployment context / sponsor context for the hackathon

## Demo constraint

The best hackathon path is to make the core voice loop work cleanly first. If live STT becomes a risk, a scenario-driven fallback is acceptable as long as the Silk voice experience stays strong.

## Keys hygiene

- Do not commit shared hackathon keys
- Do not paste them into docs, screenshots, or public repos
- Keep them in local environment variables only
- Rotate or delete them after the event

## Cocoon-specific framing

Cocoon is a proactive care-follow-up assistant. It should be pitched as:

- outbound, not passive
- multilingual, not English-only
- empathetic, not robotic
- bounded and safe, not diagnostic

## Long-term direction

The hackathon version is a narrow voice-follow-up demo. The product can later expand into:

- post-surgery follow-ups
- post-appointment follow-ups
- chronic care check-ins
- caregiver summaries
- hospital escalation workflows
