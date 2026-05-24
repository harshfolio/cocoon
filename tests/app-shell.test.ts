import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const workspaceSrc = readFileSync(join(process.cwd(), "components/workspace/cocoon-workspace.tsx"), "utf8");
const silkTtsSrc   = readFileSync(join(process.cwd(), "lib/silk/use-silk-tts.ts"), "utf8");
const deepgramSrc  = readFileSync(join(process.cwd(), "lib/stt/use-deepgram-stt.ts"), "utf8");

// ── Workspace structure ───────────────────────────────────────────────────────

test("workspace imports and wires useSilkTts", () => {
  assert.match(workspaceSrc, /useSilkTts/);
  assert.match(workspaceSrc, /useDeepgramStt/);
});

test("workspace has isSpeakingRef declared (used by TTS onStart/onEnd)", () => {
  assert.match(workspaceSrc, /isSpeakingRef/);
  // isSpeakingRef must be set true in onStart and false in onEnd
  assert.match(workspaceSrc, /isSpeakingRef\.current = true/);
  assert.match(workspaceSrc, /isSpeakingRef\.current = false/);
});

test("barge-in is disabled — no-op callback, vad_events off in STT params", () => {
  const bargeInFn = workspaceSrc.slice(workspaceSrc.indexOf("handleBargein"), workspaceSrc.indexOf("handleTranscript"));
  // Disabled barge-in is an empty callback
  assert.match(bargeInFn, /useCallback\(\(\) => \{\}/);
  // Deepgram params must not include vad_events
  assert.doesNotMatch(deepgramSrc, /vad_events=true/);
});

test("handleTranscript uses sttRef.current not bare stt reference", () => {
  const transcriptFn = workspaceSrc.slice(workspaceSrc.indexOf("handleTranscript"), workspaceSrc.indexOf("const stt = useDeepgramStt"));
  // Must not call stt.mute() or stt.unmute() directly
  assert.doesNotMatch(transcriptFn, /\bstt\.mute\b/);
  assert.doesNotMatch(transcriptFn, /\bstt\.unmute\b/);
  // Must use sttRef.current
  assert.match(transcriptFn, /sttRef\.current/);
});

test("handleStartCall mutes STT before speaking opening line", () => {
  const startFn = workspaceSrc.slice(workspaceSrc.indexOf("handleStartCall"), workspaceSrc.indexOf("handleHangup"));
  // mute() must appear before speak/playPrepared
  const muteIdx   = startFn.indexOf("mute()");
  const speakIdx  = startFn.indexOf("speak(speakOpts)");
  const prepIdx   = startFn.indexOf("playPrepared(");
  assert.ok(muteIdx > -1, "mute() call missing in handleStartCall");
  assert.ok(muteIdx < Math.min(speakIdx > -1 ? speakIdx : Infinity, prepIdx > -1 ? prepIdx : Infinity),
    "mute() must come before speak/playPrepared");
});

test("isSpeakingRef.current set true in onStart and false in onEnd/onError", () => {
  assert.match(workspaceSrc, /isSpeakingRef\.current = true/);
  assert.match(workspaceSrc, /isSpeakingRef\.current = false/);
});

// ── Silk TTS – generation counter ─────────────────────────────────────────────

test("useSilkTts uses genRef generation counter (not stopRef boolean)", () => {
  assert.match(silkTtsSrc, /genRef/);
  assert.doesNotMatch(silkTtsSrc, /stopRef/);
});

test("useSilkTts stop() increments generation", () => {
  const stopFn = silkTtsSrc.slice(silkTtsSrc.indexOf("const stop = useCallback"), silkTtsSrc.indexOf("return { speak"));
  assert.match(stopFn, /genRef\.current\+\+/);
});

test("useSilkTts checks generation after mint fetch to abort stale calls", () => {
  assert.match(silkTtsSrc, /genRef\.current !== myGen/);
});

test("useSilkTts uses 50ms lookahead for audio scheduling (not 10ms)", () => {
  assert.match(silkTtsSrc, /currentTime \+ 0\.05/);
  assert.doesNotMatch(silkTtsSrc, /currentTime \+ 0\.01/);
});

test("useSilkTts sends cleanText with normalized tone to Muga (not raw opts.text)", () => {
  assert.ok(
    silkTtsSrc.includes("${tone}") && silkTtsSrc.includes("${cleanText}"),
    "use-silk-tts must interpolate ${tone} and ${cleanText} in Muga frame"
  );
  assert.doesNotMatch(silkTtsSrc, /buildMugaPrompt/);
});

// ── Deepgram STT – callback refs ──────────────────────────────────────────────

test("useDeepgramStt uses callback refs (onTranscriptRef etc) in ws.onmessage", () => {
  assert.match(deepgramSrc, /onTranscriptRef/);
  assert.match(deepgramSrc, /onInterimRef/);
  assert.match(deepgramSrc, /onBargeinRef/);
});

test("useDeepgramStt connect() has empty deps — stable across renders", () => {
  const connectDep = deepgramSrc.slice(deepgramSrc.lastIndexOf("}, []);"), deepgramSrc.lastIndexOf("}, []);") + 10);
  assert.match(connectDep, /\[\]/);
});

test("useDeepgramStt fires onTranscript on speech_final", () => {
  const msgHandler = deepgramSrc.slice(deepgramSrc.indexOf("ws.onmessage"), deepgramSrc.indexOf("ws.onerror"));
  // speech_final block must call onTranscriptRef
  const speechFinalBlock = msgHandler.slice(msgHandler.indexOf("if (speechFinal)"), msgHandler.indexOf("if (speechFinal)") + 300);
  assert.match(speechFinalBlock, /onTranscriptRef\.current\(/);
});

test("useDeepgramStt UtteranceEnd flushes partial when not muted", () => {
  const msgHandler = deepgramSrc.slice(deepgramSrc.indexOf("ws.onmessage"), deepgramSrc.indexOf("ws.onerror"));
  assert.match(msgHandler, /UtteranceEnd/);
  assert.match(msgHandler, /partialRef\.current/);
});

test("useDeepgramStt SpeechStarted fires onBargein only when muted", () => {
  const msgHandler = deepgramSrc.slice(deepgramSrc.indexOf("ws.onmessage"), deepgramSrc.indexOf("ws.onerror"));
  const speechStartedBlock = msgHandler.slice(msgHandler.indexOf("SpeechStarted"), msgHandler.indexOf("UtteranceEnd"));
  assert.match(speechStartedBlock, /mutedRef\.current/);
  assert.match(speechStartedBlock, /onBargeinRef\.current/);
});

test("useDeepgramStt mute suppresses onTranscript but still shows interim", () => {
  const msgHandler = deepgramSrc.slice(deepgramSrc.indexOf("ws.onmessage"), deepgramSrc.indexOf("ws.onerror"));
  // Find the muted guard block: "if (mutedRef.current) { onInterimRef... return }"
  const mutedMarker = "// While muted: show interim only, never fire onTranscript";
  const mutedBlock  = msgHandler.slice(msgHandler.indexOf(mutedMarker), msgHandler.indexOf(mutedMarker) + 200);
  assert.match(mutedBlock, /onInterimRef\.current/);
  assert.doesNotMatch(mutedBlock, /onTranscriptRef\.current/);
});
