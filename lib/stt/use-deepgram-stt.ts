"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SttStatus = "idle" | "connecting" | "listening" | "error";

type UseDeepgramSttOptions = {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onBargein?: () => void;
  onError?: () => void;
};

const DG_WS = "wss://api.deepgram.com/v1/listen";

// endpointing=1200      — 1.2s silence before speech_final fires
// utterance_end_ms=2000 — safety-net flush 2s after last word
const DG_PARAMS = [
  "model=nova-3",
  "language=hi",
  "smart_format=true",
  "interim_results=true",
  "punctuate=true",
  "endpointing=1200",
  "utterance_end_ms=2000",
].join("&");

export function useDeepgramStt({ onTranscript, onInterim, onBargein, onError }: UseDeepgramSttOptions) {
  const [status, setStatus] = useState<SttStatus>("idle");

  const wsRef       = useRef<WebSocket | null>(null);
  const mediaRef    = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mutedRef    = useRef(false);
  const partialRef  = useRef("");

  // Always-current callback refs — ws.onmessage captures these refs, not the
  // closure values, so we never have stale handler issues across re-renders.
  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef    = useRef(onInterim);
  const onBargeinRef    = useRef(onBargein);
  const onErrorRef      = useRef(onError);
  onTranscriptRef.current = onTranscript;
  onInterimRef.current    = onInterim;
  onBargeinRef.current    = onBargein;
  onErrorRef.current      = onError;

  const connect = useCallback(async () => {
    if (wsRef.current) return; // already connected
    setStatus("connecting");

    try {
      const tokenRes = await fetch("/api/stt/token", { method: "POST" });
      const { apiKey } = await tokenRes.json() as { apiKey?: string };
      if (!apiKey) throw new Error("No Deepgram key");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
      });
      mediaRef.current = stream;

      const ws = new WebSocket(`${DG_WS}?${DG_PARAMS}`, ["token", apiKey]);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("listening");
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (ws.readyState === WebSocket.OPEN && e.data.size > 0) ws.send(e.data);
        };
        recorder.start(100);
        console.log("[DG] connected, recording started");
      };

      ws.onmessage = (e) => {
        if (typeof e.data !== "string") return;
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(e.data) as Record<string, unknown>; }
        catch { return; }

        const type = msg.type as string | undefined;

        // SpeechStarted → barge-in while muted
        if (type === "SpeechStarted") {
          if (mutedRef.current) {
            console.log("[DG] SpeechStarted while muted → barge-in");
            onBargeinRef.current?.();
          }
          return;
        }

        // UtteranceEnd → safety-net flush (only if no speech_final already fired)
        if (type === "UtteranceEnd") {
          if (!mutedRef.current && partialRef.current) {
            console.log("[DG] UtteranceEnd flush:", partialRef.current);
            onTranscriptRef.current(partialRef.current);
            partialRef.current = "";
            onInterimRef.current?.("");
          }
          return;
        }

        if (type !== "Results") return;

        const channel    = msg.channel as { alternatives?: Array<{ transcript?: string }> } | undefined;
        const transcript = channel?.alternatives?.[0]?.transcript?.trim() ?? "";
        const speechFinal = msg.speech_final as boolean | undefined;

        if (!transcript) return;

        // While muted: show interim only, never fire onTranscript
        if (mutedRef.current) {
          onInterimRef.current?.(transcript);
          return;
        }

        partialRef.current = transcript;
        onInterimRef.current?.(transcript);

        // speech_final = Deepgram's endpointing — primary trigger
        if (speechFinal) {
          console.log("[DG] speech_final:", transcript);
          onTranscriptRef.current(transcript);
          partialRef.current = "";
          onInterimRef.current?.("");
        }
      };

      ws.onerror = () => {
        console.error("[DG] WebSocket error");
        setStatus("error");
        onErrorRef.current?.();
      };

      ws.onclose = (ev) => {
        console.log("[DG] closed:", ev.code);
        wsRef.current = null;
        recorderRef.current = null;
        setStatus((s) => s !== "idle" ? "idle" : s);
      };
    } catch (err) {
      console.error("[DG] connect error:", err);
      setStatus("error");
      onErrorRef.current?.();
    }
  }, []); // stable — callbacks accessed via refs

  const mute = useCallback(() => {
    mutedRef.current = true;
    partialRef.current = "";
    onInterimRef.current?.("");
    console.log("[DG] muted");
  }, []);

  const unmute = useCallback(() => {
    mutedRef.current = false;
    console.log("[DG] unmuted");
  }, []);

  const stop = useCallback(() => {
    console.log("[DG] stopping");
    mutedRef.current = false;
    partialRef.current = "";
    recorderRef.current?.stop();
    recorderRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    onInterimRef.current?.("");
    setStatus("idle");
  }, []);

  const start = connect; // legacy alias

  useEffect(() => () => stop(), [stop]);

  return { status, start, connect, mute, unmute, stop };
}
