"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CallRecord, ConversationSession, ConversationIntent } from "@/lib/domain/types";
import { useSilkTts, SpeakOptions } from "@/lib/silk/use-silk-tts";
import { useDeepgramStt } from "@/lib/stt/use-deepgram-stt";

// ─── Screen states ────────────────────────────────────────────────────────────
type Screen = "waiting" | "incoming" | "in-call" | "ended";

// ─── Orb visual ───────────────────────────────────────────────────────────────

function Orb({ state }: { state: string }) {
  const ringing = state === "ringing";

  const bg = ringing       ? "rgba(255,255,255,0.10)"
    : state === "speaking"  ? "rgba(255,255,255,0.11)"
    : state === "listening" ? "rgba(29,111,164,0.18)"
    : state === "escalated" ? "rgba(192,57,43,0.18)"
    : "var(--bg-raised)";

  const border = ringing        ? "rgba(255,255,255,0.42)"
    : state === "speaking"  ? "rgba(255,255,255,0.52)"
    : state === "listening" ? "rgba(29,111,164,0.7)"
    : state === "escalated" ? "var(--red)"
    : "var(--border-1)";

  const orbClass = state === "speaking"  ? "animate-orb-speak"
    : state === "listening" ? "animate-orb-listen"
    : "";

  return (
    <div style={{ position: "relative", marginBottom: 24 }}>
      {/* Ringing rings */}
      {ringing && (
        <>
          <div className="animate-phone-ring" aria-hidden style={{ position: "absolute", inset: -34, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.35)" }} />
          <div className="animate-phone-ring" aria-hidden style={{ position: "absolute", inset: -56, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.20)", animationDelay: "0.55s" }} />
        </>
      )}
      {/* Glow */}
      <div aria-hidden style={{ position: "absolute", inset: -12, borderRadius: "50%", background: bg, filter: "blur(20px)", opacity: 0.7, transition: "background 0.5s" }} />
      {/* Circle */}
      <div
        className={orbClass}
        style={{
          position: "relative", width: 120, height: 120, borderRadius: "50%",
          background: bg, border: `1.5px solid ${border}`,
          transition: "background 0.5s, border-color 0.5s",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1,
        }}
      >
        {/* Phone icon when ringing */}
        {ringing && (
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.79 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {/* Speaking waveform bars */}
        {state === "speaking" && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, height: 28 }}>
            {[0.4, 0.75, 0.5, 1, 0.6, 0.8, 0.45].map((s, i) => (
              <span key={i} className="waveform-bar" style={{
                width: 3, height: `${s * 100}%`, borderRadius: 2,
                background: "rgba(255,255,255,0.75)", display: "block", transformOrigin: "center",
              }} />
            ))}
          </div>
        )}
        {/* Listening dot */}
        {state === "listening" && (
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(29,111,164,0.9)", animation: "orb-listen 1.4s ease-in-out infinite" }} />
        )}
        {/* Thinking dots */}
        {state === "thinking" && (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.55)", animation: `blink 1.2s ${delay}s step-end infinite`, display: "inline-block" }} />
            ))}
          </div>
        )}
        {/* Idle dot */}
        {!ringing && state !== "speaking" && state !== "listening" && state !== "thinking" && (
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: border, opacity: 0.4, transition: "all 0.4s" }} />
        )}
      </div>
    </div>
  );
}

// ─── ClientView ───────────────────────────────────────────────────────────────

export function ClientView() {
  const [screen, setScreen]             = useState<Screen>("waiting");
  const [record, setRecord]             = useState<CallRecord | null>(null);
  const [session, setSession]           = useState<ConversationSession | null>(null);
  const [interimTranscript, setInterim] = useState("");
  const [isBusy, setIsBusy]             = useState(false);
  const [hasAccepted, setHasAccepted]   = useState(false);

  const sessionRef     = useRef<ConversationSession | null>(null);
  sessionRef.current   = session;
  const recordRef      = useRef<CallRecord | null>(null);
  recordRef.current    = record;
  const hasAcceptedRef = useRef(false);
  hasAcceptedRef.current = hasAccepted;
  const isBusyRef      = useRef(false);
  isBusyRef.current    = isBusy;

  const { speak, stop: stopTts } = useSilkTts();

  // ── Build SpeakOptions from current call config ───────────────────
  const buildSpeakOpts = useCallback((
    text: string,
    intent: ConversationIntent,
    overrides?: Partial<SpeakOptions>,
  ): SpeakOptions => {
    const cfg = recordRef.current?.callConfig;
    return {
      text,
      languageLabel: cfg?.assistant.language ?? "Hindi / Hinglish",
      voiceModel: cfg?.assistant.voiceModel ?? "muga",
      ...overrides,
    };
  }, []);

  // ── Barge-in: SpeechStarted fired while Nisha is speaking ────────
  const handleBargein = useCallback(() => {
    if (!isBusyRef.current) return; // already processing
    console.log("[Client] barge-in detected — stopping TTS");
    stopTts();
    // Don't call handleTranscript yet — wait for speech_final from Deepgram
  }, [stopTts]);

  // ── STT callbacks ─────────────────────────────────────────────────
  const handleTranscript = useCallback(async (patientText: string) => {
    const cur    = sessionRef.current;
    const curRec = recordRef.current;
    if (!cur || !patientText.trim() || !curRec) return;

    stt.mute();
    setInterim("");
    setIsBusy(true);
    setSession(prev => prev ? { ...prev, state: "thinking" } : prev);

    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", callConfig: curRec.callConfig, session: cur, patientText }),
      });
      const data = await res.json() as { session: ConversationSession };
      const escalated = data.session.escalation.active;
      const next = { ...data.session, state: (escalated ? "escalated" : "speaking") as ConversationSession["state"], mode: "stt" as const };
      setSession(next);

      const intent: ConversationIntent = escalated ? "escalation" : "symptom-check";
      void speak(buildSpeakOpts(next.lastAssistantLine, intent, {
        onStart: () => setSession(prev => prev ? { ...prev, state: "speaking" } : prev),
        onEnd:   () => { stt.unmute(); setSession(prev => prev ? { ...prev, state: "listening" } : prev); },
        onError: () => { stt.unmute(); setSession(prev => prev ? { ...prev, state: "listening" } : prev); },
      }));
    } catch {
      setSession(prev => prev ? { ...prev, state: "error" } : prev);
      stt.unmute();
    } finally {
      setIsBusy(false);
    }
  }, [buildSpeakOpts, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  const stt = useDeepgramStt({
    onTranscript: handleTranscript,
    onInterim: setInterim,
    onBargein: handleBargein,
    onError: () => setSession(prev => prev ? { ...prev, state: "error" } : prev),
  });
  const sttRef = useRef(stt);
  sttRef.current = stt;

  // ── Poll for active call ──────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch("/api/session/current", { cache: "no-store" });
        const data = await res.json() as { call: CallRecord | null };
        const call = data.call;

        if (!call || call.status !== "in-call") {
          if (hasAcceptedRef.current && screen === "in-call") {
            setScreen("ended");
            stopTts();
            sttRef.current?.stop();
            setHasAccepted(false);
            setSession(null);
            setRecord(null);
          } else if (!hasAcceptedRef.current) {
            setScreen("waiting");
            setRecord(null);
          }
          return;
        }

        setRecord(call);
        if (!hasAcceptedRef.current) setScreen("incoming");

        if (screen === "ended" && call.id !== recordRef.current?.id) {
          setHasAccepted(false);
          setSession(null);
          setScreen("incoming");
        }
      } catch { /* ignore */ }
    };

    void poll();
    const iv = setInterval(poll, screen === "in-call" ? 2000 : 800);
    return () => clearInterval(iv);
  }, [screen, stopTts]);

  // ── Accept call ───────────────────────────────────────────────────
  const handleAccept = useCallback(() => {
    const call = recordRef.current;
    if (!call?.session) return;

    setHasAccepted(true);
    setScreen("in-call");
    const openingLine = call.session.lastAssistantLine;
    const sess = { ...call.session, state: "speaking" as const };
    setSession(sess);

    void sttRef.current?.connect();

    void speak(buildSpeakOpts(openingLine, "reassurance", {
      onStart: () => setSession(prev => prev ? { ...prev, state: "speaking" } : prev),
      onEnd:   () => { sttRef.current?.unmute(); setSession(prev => prev ? { ...prev, state: "listening" } : prev); },
      onError: () => { sttRef.current?.unmute(); },
    }));
  }, [buildSpeakOpts, speak]);

  // ── Hang up ───────────────────────────────────────────────────────
  const handleHangup = useCallback(async () => {
    stopTts();
    sttRef.current?.stop();
    try {
      await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionRef.current }),
      });
    } catch { /* ignore */ }
    setScreen("ended");
    setSession(null);
    setRecord(null);
    setHasAccepted(false);
  }, [stopTts]);

  // ── Render helpers ────────────────────────────────────────────────
  const assistantName = record?.callConfig?.assistant?.name || "Nisha";
  const sessionState  = session?.state ?? "idle";
  const displayLine   = (session?.lastAssistantLine ?? "")
    .replace(/^\[.*?\]\s*/, "").replace(/<[^>]+>/g, "").trim();

  const stateLabel = sessionState === "speaking"  ? "Speaking"
    : sessionState === "listening" ? "Listening"
    : sessionState === "thinking"  ? "Processing…"
    : sessionState === "escalated" ? "Escalated"
    : "Ready";

  const stateColor = sessionState === "speaking"  ? "rgba(255,255,255,0.7)"
    : sessionState === "listening" ? "rgba(29,111,164,0.9)"
    : sessionState === "thinking"  ? "rgba(180,160,220,0.8)"
    : sessionState === "escalated" ? "var(--red)"
    : "rgba(255,255,255,0.4)";

  const phoneMode = screen === "incoming" || screen === "in-call";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: phoneMode
        ? "radial-gradient(circle at 50% 16%, #34302c 0%, #211f1d 42%, #11100f 100%)"
        : "var(--bg-page)",
      fontFamily: "Inter, system-ui, sans-serif",
      color: phoneMode ? "white" : "var(--text-primary)",
      transition: "background 240ms var(--ease-out)",
    }}>

      {/* Top bar — light mode only */}
      {!phoneMode && (
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border-0)", background: "var(--bg-panel)" }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--accent-dim)", border: "1px solid rgba(91,94,166,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#5B5EA6" strokeWidth="1.2"/>
              <circle cx="6" cy="6" r="1.8" fill="#5B5EA6"/>
            </svg>
          </div>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>Cocoon</span>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-quaternary)" }}>Patient</span>
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>

        {/* ── WAITING ── */}
        {screen === "waiting" && (
          <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Orb state="idle" />
            <p style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 500, color: "var(--text-primary)" }}>No active call</p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-quaternary)", lineHeight: 1.6, maxWidth: 260 }}>
              Ask the operator to start a call. This page will ring when a call comes in.
            </p>
          </div>
        )}

        {/* ── INCOMING ── */}
        {screen === "incoming" && (
          <div className="animate-fade-up" style={{ minHeight: "100svh", width: "100%", display: "grid", gridTemplateRows: "1fr auto", alignItems: "center", padding: "44px 28px 38px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, transform: "translateY(-4vh)" }}>
              <Orb state="ringing" />
              <p style={{ margin: "10px 0 0", fontSize: 28, fontWeight: 650, color: "#fff", letterSpacing: "-0.03em" }}>{assistantName}</p>
              <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.62)" }}>Cocoon care team · Incoming call</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 34, width: "100%", maxWidth: 320, margin: "0 auto" }}>
              <button type="button" onClick={handleHangup} aria-label="Decline" style={{ border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ width: 70, height: 70, borderRadius: "50%", background: "#D43D31", display: "grid", placeItems: "center", boxShadow: "0 10px 32px rgba(212,61,49,0.35)" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg>
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>Decline</span>
              </button>
              <button type="button" onClick={handleAccept} aria-label="Accept" style={{ border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ width: 70, height: 70, borderRadius: "50%", background: "#1FA855", display: "grid", placeItems: "center", boxShadow: "0 10px 32px rgba(31,168,85,0.35)" }}>
                  <svg width="31" height="31" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.79 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>Accept</span>
              </button>
            </div>
          </div>
        )}

        {/* ── IN CALL ── */}
        {screen === "in-call" && (
          <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "42px 24px 32px" }}>
            <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 34 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.48)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Cocoon call</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.58)" }}>
                <span className="animate-live-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: stateColor, display: "inline-block" }} />
                Live
              </span>
            </div>

            <Orb state={sessionState} />

            <p style={{ margin: "0 0 5px", fontSize: 24, fontWeight: 650, color: "#fff", letterSpacing: "-0.03em" }}>{assistantName}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 28 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: stateColor, display: "inline-block" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.58)" }}>{stateLabel}</span>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 16px", width: "100%" }}>
              {displayLine && (
                <p key={displayLine.slice(0, 20)} className="animate-fade-up" style={{ margin: 0, fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.90)", lineHeight: 1.45, letterSpacing: "-0.014em", maxWidth: 340 }}>
                  &ldquo;{displayLine}&rdquo;
                </p>
              )}
              {sessionState === "listening" && (
                <div className="animate-fade-in" style={{ marginTop: 8 }}>
                  {interimTranscript ? (
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "rgba(255,255,255,0.58)", fontStyle: "italic" }}>
                      {interimTranscript}<span className="animate-blink" style={{ color: "#7EC8FF", marginLeft: 1 }}>|</span>
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.42)" }}>
                      Listening<span className="animate-blink">…</span>
                    </p>
                  )}
                </div>
              )}
              {session?.escalation.active && (
                <div className="animate-fade-in" style={{ padding: "8px 14px", borderRadius: "var(--radius-lg)", background: "var(--red-dim)", border: "1px solid rgba(192,57,43,0.2)", marginTop: 8 }}>
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--red)" }}>⚠ Care team is being notified</p>
                </div>
              )}
            </div>

            <div style={{ width: "100%", maxWidth: 340, paddingTop: 20 }}>
              <button type="button" onClick={handleHangup} style={{ width: "100%", height: 52, borderRadius: "var(--radius-pill)", background: "#D43D31", border: "none", color: "white", fontSize: "var(--text-sm)", fontWeight: 650, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 12px 34px rgba(212,61,49,0.30)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.79 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Hang up
              </button>
            </div>
          </div>
        )}

        {/* ── ENDED ── */}
        {screen === "ended" && (
          <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Orb state="idle" />
            <p style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 500, color: "var(--text-primary)" }}>Call ended</p>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-quaternary)" }}>Thanks for speaking with {assistantName}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
