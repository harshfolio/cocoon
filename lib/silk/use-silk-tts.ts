"use client";

import { useCallback, useRef } from "react";
import { extractTone, buildMulberryDescription } from "@/lib/silk/build-prompt";

export type SpeakOptions = {
  text: string;
  languageLabel: string;
  voiceModel: "muga" | "mulberry";
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (fallback: string) => void;
};

export type MintedSession = {
  ws_url: string;
  token: string;
};

// ─── Mint a WS session (no audio yet — just gets the token) ──────────────────
// Call this as early as possible (parallel with LLM) to hide the ~1.5s RTT.

export async function mintSilkSession(voiceModel: "muga" | "mulberry"): Promise<MintedSession> {
  const t0 = performance.now();
  const res = await fetch("/api/silk/ws-connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: voiceModel, text: "" }),
  });
  if (!res.ok) throw new Error(`ws-connect failed: ${res.status}`);
  const data = await res.json() as MintedSession;
  console.log(`[Silk] mint: ${(performance.now() - t0).toFixed(0)}ms`);
  return data;
}

// ─── Streaming playback ───────────────────────────────────────────────────────

async function speakStreaming(
  opts: SpeakOptions,
  mintedSession: MintedSession | null,
  myGen: number,
  genRef: React.MutableRefObject<number>,
  wsRef: React.MutableRefObject<WebSocket | null>,
  ctxRef: React.MutableRefObject<AudioContext | null>,
): Promise<void> {
  stopStreaming(wsRef, ctxRef);

  const { tone, cleanText } = extractTone(opts.text);

  // Use pre-minted session if available, otherwise mint now (fallback)
  let mintData: MintedSession;
  const t0 = performance.now();
  if (mintedSession) {
    mintData = mintedSession;
    console.log(`[Silk] using pre-minted session`);
  } else {
    console.log(`[Silk] minting fresh (no pre-mint available)`);
    try {
      const mintRes = await fetch("/api/silk/ws-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: opts.voiceModel, text: cleanText }),
      });
      if (!mintRes.ok) { opts.onError?.(opts.text); return; }
      mintData = await mintRes.json() as MintedSession;
      console.log(`[Silk] mint (fallback): ${(performance.now() - t0).toFixed(0)}ms`);
    } catch {
      opts.onError?.(opts.text);
      return;
    }
  }

  if (genRef.current !== myGen) return;

  const ctx = new AudioContext({ sampleRate: 24000 });
  ctxRef.current = ctx;
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  if (genRef.current !== myGen) { ctx.close().catch(() => {}); ctxRef.current = null; return; }

  opts.onStart?.();
  console.log(`[Silk] ws connecting: ${(performance.now() - t0).toFixed(0)}ms`);

  await new Promise<void>((resolve) => {
    const ws = new WebSocket(`${mintData.ws_url}?token=${encodeURIComponent(mintData.token)}`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    let playAt = ctx.currentTime + 0.05;
    let started = false;
    let firstChunk = true;

    ws.onopen = () => {
      if (genRef.current !== myGen) { ws.close(); resolve(); return; }
      console.log(`[Silk] ws open: ${(performance.now() - t0).toFixed(0)}ms`);

      const frame: Record<string, unknown> = opts.voiceModel === "mulberry"
        ? { text: cleanText, description: buildMulberryDescription(opts.languageLabel, tone), temperature: 0.7 }
        : { text: `[${tone}] ${cleanText}`, temperature: 0.7 };

      ws.send(JSON.stringify(frame));
    };

    ws.onmessage = (e) => {
      if (genRef.current !== myGen) { ws.close(); resolve(); return; }

      if (e.data instanceof ArrayBuffer) {
        if (firstChunk) {
          console.log(`[Silk] first chunk: ${(performance.now() - t0).toFixed(0)}ms`);
          firstChunk = false;
        }
        const pcm = new Int16Array(e.data);
        const buf = ctx.createBuffer(1, pcm.length, 24000);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;

        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        playAt = Math.max(playAt, ctx.currentTime + 0.05);
        src.start(playAt);
        playAt += buf.duration;
        started = true;
      } else {
        try {
          const msg = JSON.parse(e.data as string) as { type?: string; error?: string };
          if (msg.type === "done" || msg.error) ws.close();
        } catch { /* ignore */ }
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (!started || genRef.current !== myGen) { resolve(); return; }
      const remaining = Math.max(0, playAt - ctx.currentTime);
      const capturedGen = myGen;
      setTimeout(() => {
        if (genRef.current === capturedGen) opts.onEnd?.();
        resolve();
      }, remaining * 1000 + 80);
    };

    ws.onerror = () => {
      wsRef.current = null;
      opts.onError?.(opts.text);
      resolve();
    };
  });
}

function stopStreaming(
  wsRef: React.MutableRefObject<WebSocket | null>,
  ctxRef: React.MutableRefObject<AudioContext | null>,
) {
  if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
  if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSilkTts() {
  const wsRef  = useRef<WebSocket | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const genRef = useRef(0);

  const speak = useCallback(async (opts: SpeakOptions, minted?: MintedSession) => {
    const myGen = ++genRef.current;
    try {
      await speakStreaming(opts, minted ?? null, myGen, genRef, wsRef, ctxRef);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") opts.onError?.(opts.text);
    }
  }, []);

  const stop = useCallback(() => {
    genRef.current++;
    stopStreaming(wsRef, ctxRef);
  }, []);

  return { speak, stop };
}
