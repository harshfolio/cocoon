# Silk Voice Reference

## Muga

Muga is the Hinglish emotion-TTS model. It has two control surfaces:

1. a paragraph-level tone via `[tone]`
2. inline event tags like `<laugh>`

### Muga core rules

- Write prompts in **Latin script only**
- Use exactly one supported tone marker per paragraph
- A blank line starts a new paragraph
- Keep prompts in the 2-30 second sweet spot; around 40 seconds is the soft upper bound
- Temperature `0.7` is the reliable default

### Supported Muga tones

| Tone | Use case | Voice quality |
|---|---|---|
| `[happy]` | light, positive, friendly chat | bright, smiling, mid-energy |
| `[excited]` | hype, surprise, big reactions | loud, fast, pitch-up |
| `[sad]` | empathy, disappointment, grief | slow, breathy, lower pitch |
| `[angry]` | frustration, confrontation | tight, clipped, sharp |
| `[neutral]` | instructions, information, calm delivery | flat, even |
| `[whisper]` | quiet, intimate, reflective | soft, breathy |

### Supported Muga inline events

| Event | Meaning |
|---|---|
| `<laugh>` | loud voiced laughter |
| `<chuckle>` | soft amused laugh |
| `<sigh>` | audible breathy exhale |

### Muga event rules

- Lowercase only
- Angle brackets only
- No spaces inside the tag
- Add spaces around the tag when placed between words
- Position matters: `kya hua <sigh>` differs from `<sigh> kya hua`
- Stack at most two events

### Muga tone / event compatibility

| Tone | `<laugh>` | `<chuckle>` | `<sigh>` |
|---|---:|---:|---:|
| `[happy]` | best | best | avoid |
| `[excited]` | best | ok | avoid |
| `[sad]` | avoid | avoid | best |
| `[angry]` | avoid | rare | ok |
| `[neutral]` | ok | avoid | ok |
| `[whisper]` | avoid | ok | ok |

### Good Muga examples

```text
[neutral] Namaste chachaji, main Cocoon se bol rahi hoon. Aapki tabiyat ab kaisi hai?
```

```text
[sad] <sigh> Samajh sakti hoon. Surgery ke baad thoda mushkil lag sakta hai. Aap mujhe bataiye dard kitna ho raha hai?
```

```text
[happy] <chuckle> Achha, yeh sunke accha laga ki aapne dawai time pe le li.
```

### Bad Muga examples

```text
[sad] <laugh> sab theek ho jayega
```

```text
[happy][sad] Aap kaise hain
```

```text
यह एक टेस्ट है
```

```text
[neutral] <cough> Aapki report kal aa jayegi
```

### Muga anti-patterns to reject or auto-fix

- No `[tone]` at paragraph start
- More than one `[tone]` in the same paragraph
- Unsupported tone markers
- Unsupported event tags
- Tone / event mismatch in a clearly serious line
- Devanagari or non-Latin script input
- Long monologues that should be split into smaller turns

### Muga validation hint

Use a basic structural check like:

```text
^\[(happy|excited|sad|angry|neutral|whisper)\] .+
```

Then separately validate event tags and tone compatibility.

---

## Mulberry 1.5

Mulberry 1.5 is the fast, flexible TTS model suited for realtime agents.

### Mulberry core rules

- Write prompts in **Latin script only**
- Guide the voice with one short natural-language description
- Keep the description concrete: around 3-5 attributes
- Use inline expressive tags only when they improve delivery

### Mulberry inline tags

Supported expressive tags include:

```text
<laugh>
<laugh_harder>
<sigh>
<chuckle>
<gasp>
<angry>
<excited>
<whisper>
<cry>
<scream>
<sing>
<snort>
<exhale>
<gulp>
<giggle>
<sarcastic>
<curious>
```

### Mulberry voice attributes

Use these naturally in a sentence, not as a structured schema.

#### Age
- `20s`
- `30s`
- `40s`

#### Accent
- `american`
- `british`
- `middle_eastern`
- `asian_american`
- `indian`

#### Indian regional accent options
- `hindi`
- `punjabi`
- `bihari`
- `south_indian`
- `bengali`
- `rajasthani`
- `marathi`
- `gujarati`
- `kashmiri`
- `assamese`
- `odia`
- `telugu`
- `kannada`
- `malayali`
- `haryanvi`
- `chhattisgarhi`

#### Pitch
- `low`
- `normal`
- `high`

#### Timbre
- `deep`
- `warm`
- `gravelly`
- `smooth`
- `raspy`
- `nasally`
- `throaty`
- `harsh`
- `whisper`
- `robotic`
- `ethereal`

#### Pacing
- `very slow`
- `slow`
- `conversational`
- `brisk`
- `fast`
- `very_fast`

#### Emotion
- `neutral`
- `energetic`
- `excited`
- `sad`
- `sarcastic`
- `dry`
- `crying`
- `angry`

#### Intensity
- `low`
- `med`
- `high`

#### Register
- `formal`
- `neutral`
- `casual`

### Mulberry speaking roles

Useful role anchors:

- `healthcare_assistant`
- `customer_support_agent`
- `virtual_receptionist`
- `podcast_host`
- `interviewer`
- `storyteller`
- `explainer_video_voice`

### Good Mulberry descriptions

```text
a warm 30s hindi accent female voice, conversational pacing, calm and reassuring, healthcare assistant
```

```text
a deep 40s indian male voice, slow pacing, formal register, virtual receptionist
```

```text
a smooth bengali accent voice, conversational pacing, gentle and neutral, healthcare assistant
```

### Bad Mulberry descriptions

```text
a very very amazing super nice magical voice that sounds emotional and good and natural and premium and lovely
```

```text
female, indian, warm, healthcare, casual, voice, assistant, calm, nice, soft, 30s, conversational
```

The first is too vague. The second is keyword soup. Prefer one short sentence.

---

## Cocoon model guidance

### Use Muga when
- the line needs emotional performance
- you want precise paragraph tone control
- the line is Hinglish and patient-facing
- you are writing the most memorable parts of the demo

### Use Mulberry 1.5 when
- latency matters
- the turn is functional and part of a realtime loop
- you need voice shaping through a compact description
- you want multi-speaker or more flexible voice-agent flows

### Keep Spider out of the MVP
- okay to mention in roadmap
- do not make today's demo depend on it

---

## Healthcare prompt guardrails

- no diagnoses
- no treatment advice beyond approved reminder-style language
- no panic-inducing wording
- always escalate instead of pretending certainty
- keep the assistant framed as a follow-up helper, not a clinician
