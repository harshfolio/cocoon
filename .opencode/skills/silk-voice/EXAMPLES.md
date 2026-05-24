# Silk Voice Examples — Cocoon

All prompts assume Latin script only.

---

## Mulberry 1.5 — healthcare assistant voice descriptions

Use these as the voice description field in Mulberry calls.

### Hinglish default

```text
a warm 30s hindi accent female voice, conversational pacing, calm and reassuring, healthcare assistant
```

### Bengali assistant

```text
a smooth bengali accent female voice, conversational pacing, gentle and neutral, healthcare assistant
```

### Formal IVR fallback

```text
a deep 40s indian male voice, slow pacing, formal register, virtual receptionist
```

---

## Muga — Hinglish opening greetings

### Warm post-surgery greeting

```text
[happy] Namaste chachaji, main Cocoon se bol rahi hoon. Doctor ne kal surgery ke baad bola tha ki hum aapse check-in karein. Aapki tabiyat ab kaisi hai?
```

### Post-appointment check-in

```text
[happy] Namaste, main Cocoon ki taraf se bol rahi hoon. Aapki appointment ke baad bas ek quick follow-up call thi. Aap kaise feel kar rahe hain?
```

### Familiar elder check-in

```text
[happy] Namaste dadiji, main Cocoon se bol rahi hoon. Aapka kal ka check-up hua tha na. Doctor ne bola tha aapse ek baar haal-chaal puch loon. Aapki tabiyat kaisi hai aaj?
```

---

## Muga — medication checks

### Routine medication follow-up

```text
[neutral] Theek hai chachaji, main bas yeh confirm karna chahti hoon ki aapne subah wali antibiotic aur painkiller time pe le li?
```

### Missed-dose check

```text
[neutral] Aur dawai ki baat karein toh, aapne subah ki dose le li thi? Koi dose miss toh nahi hui?
```

### Gentle reminder

```text
[happy] <chuckle> Aur haan chachaji, dawai time pe leni hai please. Doctor ne specifically bola tha ki antibiotic complete karna important hai.
```

---

## Muga — symptom checks and concern

### Checking pain

```text
[neutral] Aur surgery area mein koi dard, swelling, ya garmi feel ho rahi hai?
```

### Expressing concern

```text
[sad] <sigh> Oh chachaji, yeh sunke accha nahi laga ki aapko dard ho raha hai. Dard kitna zyada hai? Ek se das mein bata sakte hain?
```

### Reassuring the patient

```text
[sad] <sigh> Samajh sakti hoon, surgery ke baad thoda uncomfortable lag sakta hai. Aap tension mat lijiye, main saari details note kar rahi hoon.
```

---

## Muga — escalation

### Detecting risk

```text
[neutral] Bukhar, zyada bleeding, ya chakkar jaisa kuch bhi ho raha hai kya?
```

### Gentle escalation to doctor

```text
[neutral] Theek hai chachaji, aapne fever mention kiya hai. Main isko doctor ke liye abhi priority pe flag kar deti hoon. Aap tension mat lijiye, clinic ki team jaldi se aapse contact karegi.
```

### Calm urgent handoff

```text
[neutral] Theek hai, main samajh gayi. Aapka blood pressure kaafi high lag raha hai. Main isko turant doctor ke paas bhej deti hoon. Tab tak aap aaram se baithe rahiye aur paani peete rahiye. Team aapse contact karegi.
```

---

## Muga — closing and next steps

### Normal recovery close

```text
[happy] <chuckle> Bahut accha chachaji. Aapki recovery achi lag rahi hai. Doctor ne kal ek aur follow-up ke liye bola tha. Tab tak dawai time pe lete rahiye aur kuch problem ho toh humein batayein. Take care chachaji.
```

### Reminder to call back

```text
[neutral] Theek hai, agar kuch bhi halka sa bhi unusual lage, humein turant contact karein. Clinic ka number aapke paas hai. Main kal fir se call karoongi check-in ke liye. Good night chachaji.
```

---

## Mulberry 1.5 — multi-turn fallback prompts

Use Mulberry for every routine turn after the opening and emotion-heavy moments.

### Voice description

```text
a warm 30s hindi accent female voice, conversational pacing, calm and reassuring, healthcare assistant
```

### Routine prompt body (example)

```text
Theek hai, aapne dawai li toh bahut acchi baat hai. Ek aur choti si baat puchni thi.
```

```text
Dawai ke alawa koi aur symptom feel hua? Jaise halka fever, chakkar, ya bleeding?
```

```text
Bahut accha. Aapki recovery achi chal rahi hai. Main aaj ka update doctor ko share kar doongi.
```

---

## Non-Hinglish fallback

### English greeting (Muga, neutral)

```text
[neutral] Hello, this is Cocoon checking in after your surgery. Doctor wanted us to follow up. How are you feeling today?
```

### English escalation (Muga, neutral)

```text
[neutral] I understand. I'll flag this for your doctor right now. Someone from the clinic will reach out shortly. Please stay comfortable and don't hesitate to call us if anything changes.
```

### English closing (Muga, happy)

```text
[happy] That's great to hear. Your recovery looks good. Keep taking your medication on time and we'll check in again tomorrow. Take care.
```

---

## Cocoon call-stage reference

| Call stage | Model | Tone | Example key phrase |
|---|---|---|---|
| Opening | Muga | `[happy]` or `[neutral]` | Namaste chachaji, main Cocoon se bol rahi hoon |
| Medication check | Muga or Mulberry | `[neutral]` | Aapne subah ki dawai le li? |
| Concern / empathy | Muga | `[sad]` + `<sigh>` | Samajh sakti hoon, surgery ke baad thoda mushkil hai |
| Escalation | Muga or Mulberry | `[neutral]` | Main isko doctor ke liye abhi flag kar deti hoon |
| Closing | Muga | `[happy]` | Bahut accha chachaji, aapki recovery achi lag rahi hai |
| Routine turns | Mulberry | N/A | Short neutral follow-up prompts |