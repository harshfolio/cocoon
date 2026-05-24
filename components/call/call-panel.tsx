"use client";

import { useEffect, useRef } from "react";
import { ConversationSession } from "@/lib/domain/types";

// ─── Speaker metadata ─────────────────────────────────────────────────────────

const SPEAKER_META: Record<string, { color: string; label: string; align: "left" | "right" }> = {
  assistant: { color: "var(--accent-text)", label: "Nisha",   align: "left"  },
  patient:   { color: "var(--blue)",        label: "Patient", align: "right" },
  system:    { color: "var(--text-quaternary)", label: "System", align: "left" },
};

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ callActive, patientName }: { callActive: boolean; patientName: string }) {
  if (callActive) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, padding: "0 32px", textAlign: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent-dim)", border: "1px solid rgba(91,94,166,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
          <span className="animate-blink" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)" }}>
          Waiting for {patientName || "patient"} to accept
        </p>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-quaternary)" }}>
          Transcript will appear here as the call progresses
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 6, padding: "0 32px", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-quaternary)", lineHeight: 1.6 }}>
        No active call. Configure in <strong style={{ color: "var(--text-tertiary)" }}>Config</strong> and press Call me.
      </p>
    </div>
  );
}

// ─── Transcript turn ──────────────────────────────────────────────────────────

function Turn({ speaker, text }: { speaker: string; text: string }) {
  const meta = SPEAKER_META[speaker] ?? SPEAKER_META.system;
  const displayText = text.replace(/^\[.*?\]\s*/, "").replace(/<[^>]+>/g, "").trim();
  if (!displayText) return null;

  const isPatient = speaker === "patient";

  return (
    <div
      className="animate-turn-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isPatient ? "flex-end" : "flex-start",
        gap: 3,
      }}
    >
      <span style={{
        fontSize: "10px", fontWeight: 600,
        color: meta.color, letterSpacing: "0.04em",
        textTransform: "uppercase",
        paddingLeft: isPatient ? 0 : 2,
        paddingRight: isPatient ? 2 : 0,
      }}>
        {meta.label}
      </span>
      <div style={{
        maxWidth: "82%",
        padding: "8px 12px",
        borderRadius: isPatient ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
        background: isPatient ? "var(--bg-raised)" : "var(--accent-dim)",
        border: `1px solid ${isPatient ? "var(--border-0)" : "rgba(91,94,166,0.15)"}`,
        fontSize: "var(--text-sm)",
        color: "var(--text-primary)",
        lineHeight: 1.55,
      }}>
        {displayText}
      </div>
    </div>
  );
}

// ─── CallPanel ────────────────────────────────────────────────────────────────

type CallPanelProps = {
  session: ConversationSession | null;
  callActive: boolean;
  patientName: string;
};

export function CallPanel({ session, callActive, patientName }: CallPanelProps) {
  const turns       = session?.transcript ?? [];
  const scrollRef   = useRef<HTMLDivElement>(null);
  const escalation  = session?.escalation;

  // Auto-scroll to bottom on new turns
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>

      {/* Escalation banner — sticky at top when active */}
      {escalation?.active && (
        <div className="animate-fade-in" style={{
          flexShrink: 0,
          margin: "10px 16px 0",
          padding: "10px 14px",
          borderRadius: "var(--radius-lg)",
          background: "var(--red-dim)",
          border: "1px solid rgba(192,57,43,0.22)",
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--red)" }}>
              Escalation — {escalation.concernLevel} concern
            </p>
            {escalation.recommendedAction && (
              <p style={{ margin: "3px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                → {escalation.recommendedAction}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Transcript scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 0,
        }}
      >
        {turns.length === 0 ? (
          <EmptyState callActive={callActive} patientName={patientName} />
        ) : (
          turns.map(turn => (
            <Turn key={turn.id} speaker={turn.speaker} text={turn.text} />
          ))
        )}
      </div>

    </div>
  );
}
