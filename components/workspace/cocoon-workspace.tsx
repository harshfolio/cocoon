"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CallPanel }   from "@/components/call/call-panel";
import { ConfigPanel } from "@/components/config/config-panel";
import { ClinicPanel } from "@/components/clinic/clinic-panel";
import { useSilkTts, SpeakOptions, mintSilkSession, MintedSession } from "@/lib/silk/use-silk-tts";
import { useDeepgramStt } from "@/lib/stt/use-deepgram-stt";
import { CallConfig, CallRecord, ConversationSession, ConversationIntent } from "@/lib/domain/types";
import { getHarshPreset } from "@/lib/config/presets";


type Tab = "call" | "config" | "clinic";

// ─── CocoonWorkspace ──────────────────────────────────────────────────────────

export function CocoonWorkspace() {
  const [config, setConfig]             = useState<CallConfig>(getHarshPreset());
  const [activeTab, setActiveTab]       = useState<Tab>("config"); // Config first until call starts
  const [isBusy, setIsBusy]             = useState(false);
  const [activeRecord, setActiveRecord] = useState<CallRecord | null>(null);
  // Patient-side audio state (runs in same browser now)
  const [session, setSession]           = useState<ConversationSession | null>(null);
  const [interimTranscript, setInterim] = useState("");

  const configRef  = useRef<CallConfig>(config);
  configRef.current = config;
  const sessionRef = useRef<ConversationSession | null>(null);
  sessionRef.current = session;
  const recordRef  = useRef<CallRecord | null>(null);
  recordRef.current = activeRecord;
  const isBusyRef    = useRef(false);
  isBusyRef.current  = isBusy;
  const isSpeakingRef = useRef(false); // true while TTS audio is playing

  // ── Audio hooks ───────────────────────────────────────────────────
  const { speak, stop: stopTts } = useSilkTts();

  const buildSpeakOpts = useCallback((
    text: string,
    _intent: ConversationIntent,
    overrides?: Partial<SpeakOptions>,
  ): SpeakOptions => {
    const cfg = recordRef.current?.callConfig ?? configRef.current;
    return {
      text,
      languageLabel: cfg.assistant.language,
      voiceModel: cfg.assistant.voiceModel,
      ...overrides,
    };
  }, []);

  // Speculative WS mint — fired when call starts and after each turn completes
  // so the next turn's mint is always warm when the patient starts speaking.
  const nextMintRef = useRef<Promise<MintedSession> | null>(null);

  const warmMint = useCallback(() => {
    const voiceModel = recordRef.current?.callConfig.assistant.voiceModel ?? configRef.current.assistant.voiceModel;
    nextMintRef.current = mintSilkSession(voiceModel).catch(() => null) as Promise<MintedSession>;
  }, []);

  // Barge-in disabled — vad_events off in Deepgram params (too noisy for demo).
  const handleBargein = useCallback(() => {}, []);

  const handleTranscript = useCallback(async (patientText: string) => {
    const cur    = sessionRef.current;
    const curRec = recordRef.current;
    if (!cur || !patientText.trim() || !curRec) return;

    // Use sttRef.current to avoid temporal dead zone and stale closure issues
    sttRef.current?.mute();
    setInterim("");
    setIsBusy(true);
    setSession(prev => prev ? { ...prev, state: "thinking" } : prev);

    const t0 = performance.now();
    const voiceModel = curRec.callConfig.assistant.voiceModel;

    try {
      // ── Use warm mint if available, otherwise mint fresh in parallel ──
      // warmMint() fires speculatively after each turn so the next turn's
      // mint session is already in flight before the patient even speaks.
      const mintPromise = nextMintRef.current ?? mintSilkSession(voiceModel);
      nextMintRef.current = null; // consume it

      const [llmRes, minted] = await Promise.allSettled([
        fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "respond", callConfig: curRec.callConfig, session: cur, patientText }),
        }),
        mintPromise,
      ]);

      if (llmRes.status === "rejected") throw new Error("LLM failed");

      const data = await (llmRes.value as Response).json() as { session: ConversationSession };
      console.log(`[Turn] LLM: ${(performance.now() - t0).toFixed(0)}ms | mint: ${minted.status === "fulfilled" ? "ready" : "failed"}`);
      console.log(`[Turn] → "${data.session.lastAssistantLine.slice(0, 80)}"`);

      const mintedSession: MintedSession | undefined = minted.status === "fulfilled" ? minted.value : undefined;

      const escalated = data.session.escalation.active;
      const next: ConversationSession = {
        ...data.session,
        state: escalated ? "escalated" : "speaking",
        mode: "stt",
      };
      setSession(next);
      setActiveRecord(prev => prev ? { ...prev, session: next } : prev);

      const intent: ConversationIntent = escalated ? "escalation" : "symptom-check";

      const safetyTimer = setTimeout(() => {
        if (isSpeakingRef.current) {
          console.warn("[STT] safety unmute fired");
          isSpeakingRef.current = false;
          sttRef.current?.unmute();
          setSession(prev => prev ? { ...prev, state: "listening" } : prev);
        }
      }, 15000);

      void speak(buildSpeakOpts(next.lastAssistantLine, intent, {
        onStart: () => {
          isSpeakingRef.current = true;
          setSession(prev => prev ? { ...prev, state: "speaking" } : prev);
          warmMint(); // pre-warm next turn's mint while Nisha is speaking
        },
        onEnd:   () => { clearTimeout(safetyTimer); isSpeakingRef.current = false; sttRef.current?.unmute(); setSession(prev => prev ? { ...prev, state: "listening" } : prev); },
        onError: () => { clearTimeout(safetyTimer); isSpeakingRef.current = false; sttRef.current?.unmute(); setSession(prev => prev ? { ...prev, state: "listening" } : prev); },
      }), mintedSession);
    } catch {
      setSession(prev => prev ? { ...prev, state: "error" } : prev);
      isSpeakingRef.current = false;
      sttRef.current?.unmute();
    } finally {
      setIsBusy(false);
    }
  }, [buildSpeakOpts, speak]);

  const stt = useDeepgramStt({
    onTranscript: handleTranscript,
    onInterim: setInterim,
    onBargein: handleBargein,
    onError: () => {},
  });
  const sttRef = useRef(stt);
  sttRef.current = stt;

  // ── Poll server call state ────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch("/api/session/current", { cache: "no-store" });
        const data = await res.json() as { call: CallRecord | null };
        if (data.call) setActiveRecord(data.call);
      } catch { /* ignore */ }
    };
    void poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, []);

  // ── Start call ────────────────────────────────────────────────────
  const handleStartCall = useCallback(async (overrideConfig?: CallConfig) => {
    if (isBusy) return;
    setIsBusy(true);
    const cfg = overrideConfig ?? configRef.current;

    try {
      await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: null }),
      });

      const convRes = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", callConfig: cfg, mode: "stt" }),
      });
      const { session: newSession } = await convRes.json() as { session: ConversationSession };

      const startRes = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callConfig: cfg, session: newSession }),
      });
      const startData = await startRes.json() as { call?: CallRecord };
      const call = startData.call;
      if (!call) throw new Error("no call record");

      if (overrideConfig) setConfig(overrideConfig);
      setActiveRecord(call);

      // Start audio — connect STT immediately, speak opening line
      const openingLine = newSession.lastAssistantLine;
      const sess: ConversationSession = { ...newSession, state: "speaking" };
      setSession(sess);
      setActiveTab("call");

      void sttRef.current?.connect();
      sttRef.current?.mute(); // keep mic muted until opening line finishes

      // Safety unmute: if onEnd never fires, unblock after 15s
      const openingSafetyTimer = setTimeout(() => {
        if (isSpeakingRef.current) {
          console.warn("[STT] opening safety unmute fired");
          isSpeakingRef.current = false;
          sttRef.current?.unmute();
          setSession(prev => prev ? { ...prev, state: "listening" } : prev);
        }
      }, 15000);

      void speak(buildSpeakOpts(openingLine, "reassurance", {
        onStart: () => {
          isSpeakingRef.current = true;
          setSession(prev => prev ? { ...prev, state: "speaking" } : prev);
          warmMint(); // pre-warm turn-1 mint while opening line plays
        },
        onEnd:   () => { clearTimeout(openingSafetyTimer); isSpeakingRef.current = false; sttRef.current?.unmute(); setSession(prev => prev ? { ...prev, state: "listening" } : prev); },
        onError: () => { clearTimeout(openingSafetyTimer); isSpeakingRef.current = false; sttRef.current?.unmute(); },
      }));
    } catch (err) {
      console.error("[Workspace] Start call error:", err);
    } finally {
      setIsBusy(false);
    }
  }, [buildSpeakOpts, isBusy, speak, warmMint]);

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
    setActiveRecord(null);
    setSession(null);
    setInterim("");
    setActiveTab("config");
  }, [stopTts]);

  const callActive  = activeRecord?.status === "in-call";
  const sessionState = session?.state ?? "idle";

  // ── Tab styles ────────────────────────────────────────────────────
  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: "6px 14px", border: "none",
    background: activeTab === tab ? "var(--bg-active)" : "transparent",
    color: activeTab === tab ? "var(--text-primary)" : "var(--text-tertiary)",
    fontSize: "var(--text-sm)", fontWeight: activeTab === tab ? 500 : 400,
    borderRadius: "var(--radius-md)", cursor: "pointer",
    transition: "all var(--speed-fast)", letterSpacing: "-0.008em",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "14px 18px", background: "var(--bg-page)" }}>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 12, minHeight: 0 }}>

        {/* ── Left panel ───────────────────────────────────────────── */}
        <div style={{ minHeight: 0, height: "calc(100vh - 32px)", position: "sticky", top: 16, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-panel)", border: "1px solid var(--border-0)", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>

            {/* Header */}
            <div style={{ padding: "11px 16px 9px", borderBottom: "1px solid var(--border-0)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--accent-dim)", border: "1px solid rgba(91,94,166,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="#5B5EA6" strokeWidth="1.2"/>
                    <circle cx="6" cy="6" r="1.8" fill="#5B5EA6"/>
                  </svg>
                </div>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Cocoon</span>
                <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--accent-text)", background: "var(--accent-dim)", padding: "1px 6px", borderRadius: "var(--radius-pill)", border: "1px solid rgba(91,94,166,0.18)", letterSpacing: "0.03em" }}>demo</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {callActive && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px", color: "var(--green)", fontWeight: 500 }}>
                    <span className="animate-live-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }}/>
                    Live
                  </span>
                )}
                <div style={{ display: "flex", gap: 2 }}>
                  {(["call", "config", "clinic"] as Tab[]).map(tab => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                      {tab === "call" ? "Call" : tab === "config" ? "Config" : "Clinic"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {activeTab === "call" && (
                <CallPanel
                  session={session}
                  callActive={callActive}
                  patientName={config.patient.displayName}
                />
              )}
              {activeTab === "config" && (
                <ConfigPanel
                  config={config}
                  onChange={cfg => { if (!callActive) setConfig(cfg); }}
                  locked={callActive}
                />
              )}
              {activeTab === "clinic" && (
                <ClinicPanel onStartCall={cfg => { void handleStartCall(cfg); }} />
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel — call UI ─────────────────────────────────── */}
        <div style={{ minHeight: 0, height: "calc(100vh - 32px)", position: "sticky", top: 16 }}>
          <CallPanel_Right
            config={config}
            callActive={callActive}
            isBusy={isBusy}
            sessionState={sessionState}
            session={session}
            interimTranscript={interimTranscript}
            onStartCall={() => void handleStartCall()}
            onHangup={handleHangup}
          />
        </div>

      </div>
    </div>
  );
}

// ─── Right panel — unified call UI ───────────────────────────────────────────
//
// Idle:   orb + assistant name + "Call me" button
// In-call: orb animated per state + last spoken line + interim transcript + hang up

function CallPanel_Right({
  config, callActive, isBusy, sessionState, session, interimTranscript, onStartCall, onHangup,
}: {
  config: CallConfig;
  callActive: boolean;
  isBusy: boolean;
  sessionState: string;
  session: ConversationSession | null;
  interimTranscript: string;
  onStartCall: () => void;
  onHangup: () => void;
}) {
  const canCall    = !isBusy && !callActive;
  const rawLine    = session?.lastAssistantLine ?? "";
  const displayLine = rawLine.replace(/^\[.*?\]\s*/, "").replace(/<[^>]+>/g, "").trim();

  const stateColor = sessionState === "speaking"  ? "var(--accent-text)"
    : sessionState === "listening" ? "var(--blue)"
    : sessionState === "thinking"  ? "var(--state-thinking)"
    : sessionState === "escalated" ? "var(--red)"
    : "var(--text-quaternary)";

  const stateLabel = sessionState === "speaking"  ? "Speaking"
    : sessionState === "listening" ? "Listening"
    : sessionState === "thinking"  ? "Processing…"
    : sessionState === "escalated" ? "Escalated"
    : callActive ? "Connecting…"
    : "Ready";

  const orbClass = sessionState === "speaking"  ? "animate-orb-speak"
    : sessionState === "listening" ? "animate-orb-listen"
    : "";

  return (
    <div style={{
      height: "100%", background: "var(--bg-panel)",
      border: "1px solid var(--border-0)", borderRadius: 10,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "36px 28px 24px", position: "relative", overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>

      {/* Ambient wash */}
      <div aria-hidden style={{
        position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)",
        width: 320, height: 320, borderRadius: "50%",
        background: callActive ? "var(--accent-dim)" : "var(--bg-raised)",
        filter: "blur(80px)", opacity: 0.65, pointerEvents: "none",
        transition: "background 0.8s",
      }} />

      <div style={{ flex: "0 0 5%" }} />

      {/* Orb */}
      <div style={{ position: "relative", marginBottom: 18 }}>
        <div aria-hidden style={{ position: "absolute", inset: -10, borderRadius: "50%", background: callActive ? "var(--accent-dim)" : "var(--bg-raised)", filter: "blur(16px)", opacity: 0.8, transition: "background 0.5s" }} />
        <div
          className={orbClass}
          style={{
            position: "relative", width: 96, height: 96, borderRadius: "50%",
            background: callActive ? "var(--accent-dim)" : "var(--bg-raised)",
            border: `1.5px solid ${callActive ? "var(--accent)" : "var(--border-1)"}`,
            transition: "background 0.5s, border-color 0.5s",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1,
          }}
        >
          {/* Speaking: waveform */}
          {sessionState === "speaking" && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, height: 22 }}>
              {[0.4, 0.75, 0.5, 1, 0.6, 0.8, 0.45].map((s, i) => (
                <span key={i} className="waveform-bar" style={{ width: 2.5, height: `${s * 100}%`, borderRadius: 2, background: "var(--accent)", display: "block", transformOrigin: "center" }} />
              ))}
            </div>
          )}
          {/* Thinking: three dots */}
          {sessionState === "thinking" && (
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--state-thinking)", animation: `blink 1.2s ${delay}s step-end infinite`, display: "inline-block", opacity: 0.7 }} />
              ))}
            </div>
          )}
          {/* Default dot */}
          {sessionState !== "speaking" && sessionState !== "thinking" && (
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: callActive ? "var(--accent)" : "rgba(0,0,0,0.08)", opacity: callActive ? 0.55 : 0.18, transition: "all 0.4s" }} />
          )}
        </div>
      </div>

      {/* Name + state */}
      <p style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.012em" }}>
        {config.assistant.name || "Nisha"}
      </p>
      <div style={{ marginTop: 4, marginBottom: 20, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: stateColor, display: "inline-block", transition: "background 0.4s" }} />
        <span style={{ fontSize: "11px", fontWeight: 500, color: stateColor, letterSpacing: "0.01em" }}>{stateLabel}</span>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center" }}>

        {/* Last spoken line */}
        {displayLine ? (
          <p key={displayLine.slice(0, 20)} className="animate-fade-up" style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.014em", lineHeight: 1.45, maxWidth: 300 }}>
            &ldquo;{displayLine}&rdquo;
          </p>
        ) : callActive ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-quaternary)", lineHeight: 1.6 }}>
            Starting call…
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-quaternary)", lineHeight: 1.6, maxWidth: 240 }}>
            Configure in <strong>Config</strong>, then press Call me.
          </p>
        )}

        {/* Mic activity + interim transcript */}
        {sessionState === "listening" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {/* Mic waveform bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 22 }}>
              {[14, 20, 10, 18, 12].map((h, i) => (
                <span key={i} className="mic-bar" style={{
                  width: 3, height: h, borderRadius: 2,
                  background: interimTranscript ? "var(--blue)" : "var(--text-quaternary)",
                  display: "block",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            {interimTranscript ? (
              <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-tertiary)", fontStyle: "italic", maxWidth: 280, textAlign: "center" }}>
                {interimTranscript}<span className="animate-blink" style={{ color: "var(--blue)", marginLeft: 1 }}>|</span>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-quaternary)" }}>
                Listening<span className="animate-blink">…</span>
              </p>
            )}
          </div>
        )}

        {/* Escalation */}
        {session?.escalation.active && (
          <div className="animate-fade-in" style={{ padding: "8px 12px", borderRadius: "var(--radius-lg)", background: "var(--red-dim)", border: "1px solid rgba(192,57,43,0.2)", maxWidth: 300, textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--red)" }}>
              ⚠ Escalation — {session.escalation.concernLevel} concern
            </p>
            {session.escalation.recommendedAction && (
              <p style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                → {session.escalation.recommendedAction}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ width: "100%", display: "flex", gap: 8 }}>
        {canCall && (
          <button type="button" onClick={onStartCall} disabled={isBusy} className="animate-fade-up"
            style={{ flex: 1, height: 40, borderRadius: "var(--radius-md)", background: "var(--accent)", border: "none", color: "#fff", fontSize: "var(--text-sm)", fontWeight: 600, cursor: isBusy ? "not-allowed" : "pointer", opacity: isBusy ? 0.5 : 1, transition: "background var(--speed-fast)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--accent-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--accent)")}
          >
            {isBusy ? "Starting…" : "Call me"}
          </button>
        )}
        {callActive && (
          <button type="button" onClick={onHangup}
            style={{ flex: 1, height: 40, borderRadius: "var(--radius-md)", background: "var(--red-dim)", border: "1px solid rgba(192,57,43,0.25)", color: "var(--red)", fontSize: "var(--text-sm)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background var(--speed-fast)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(192,57,43,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--red-dim)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.79 19.79 19.79 0 01.02 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Hang up
          </button>
        )}
      </div>
    </div>
  );
}
