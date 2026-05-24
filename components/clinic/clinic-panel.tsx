"use client";

import { useEffect, useState, useCallback } from "react";
import { ClinicRecord, PatientStatus, CallConfig } from "@/lib/domain/types";

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_META: Record<PatientStatus, { color: string; label: string; bg: string; border: string }> = {
  pending:   { color: "var(--text-quaternary)", label: "Pending",   bg: "transparent",      border: "var(--border-1)" },
  "in-call": { color: "var(--accent-text)",     label: "In call",   bg: "var(--accent-dim)", border: "rgba(91,94,166,0.25)" },
  completed: { color: "var(--green)",           label: "Completed", bg: "var(--green-dim)",  border: "rgba(30,126,62,0.2)" },
  escalated: { color: "var(--red)",             label: "Escalated", bg: "var(--red-dim)",    border: "rgba(192,57,43,0.2)" },
};

function formatRelativeTime(ms: number | null): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Patient row ──────────────────────────────────────────────────────────────

function PatientRow({
  record,
  onStartCall,
  calling,
}: {
  record: ClinicRecord;
  onStartCall?: (config: CallConfig) => void;
  calling?: boolean;
}) {
  const meta = STATUS_META[record.status];
  const canCall = record.status === "pending" || record.status === "escalated";
  const actionLabel = record.status === "escalated" ? "Call back" : "Call";

  return (
    <div
      style={{
        padding: "13px 18px",
        borderBottom: "1px solid var(--border-0)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        transition: "background var(--speed-fast)",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Status dot */}
      <div style={{ paddingTop: 3, flexShrink: 0 }}>
        <span style={{
          display: "block", width: 8, height: 8, borderRadius: "50%",
          background: meta.color,
          opacity: record.status === "pending" ? 0.4 : 1,
        }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.008em" }}>
            {record.patientName}
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 500, color: meta.color,
            background: meta.bg, border: `1px solid ${meta.border}`,
            padding: "1px 6px", borderRadius: "var(--radius-pill)",
          }}>
            {meta.label}
          </span>
          {record.lastContactAt && (
            <span style={{ fontSize: "11px", color: "var(--text-quaternary)" }}>
              {formatRelativeTime(record.lastContactAt)}
            </span>
          )}
        </div>

        {record.summary ? (
          <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {record.summary}
          </p>
        ) : (
          <p style={{ margin: "3px 0 0", fontSize: "var(--text-xs)", color: "var(--text-quaternary)", lineHeight: 1.5 }}>
            {record.context}
          </p>
        )}
      </div>

      {/* Action */}
      {canCall && record.callConfig && onStartCall && (
        <button
          type="button"
          onClick={() => onStartCall(record.callConfig!)}
          disabled={calling}
          style={{
            flexShrink: 0,
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${record.status === "escalated" ? "rgba(192,57,43,0.3)" : "var(--border-1)"}`,
            background: record.status === "escalated" ? "var(--red-dim)" : "transparent",
            color: record.status === "escalated" ? "var(--red)" : "var(--text-tertiary)",
            fontSize: "var(--text-xs)", fontWeight: 500,
            cursor: calling ? "wait" : "pointer",
            opacity: calling ? 0.65 : 1,
            transition: "all var(--speed-fast)",
            whiteSpace: "nowrap",
          }}
        >
          {calling ? "Calling…" : `${actionLabel} →`}
        </button>
      )}
    </div>
  );
}

// ─── ClinicPanel ──────────────────────────────────────────────────────────────

type ClinicPanelProps = {
  onStartCall?: (config: CallConfig) => void;
};

export function ClinicPanel({ onStartCall }: ClinicPanelProps) {
  const [records, setRecords] = useState<ClinicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic");
      const data = await res.json() as { records: ClinicRecord[] };
      setRecords(data.records);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecords();
    const interval = setInterval(fetchRecords, 4000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  const escalated  = records.filter(r => r.status === "escalated");
  const inCall     = records.filter(r => r.status === "in-call");
  const completed  = records.filter(r => r.status === "completed");
  const pending    = records.filter(r => r.status === "pending");
  const ordered    = [...inCall, ...escalated, ...pending, ...completed];

  const summary = {
    total:     records.length,
    pending:   pending.length,
    completed: completed.length,
    escalated: escalated.length,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* Summary bar */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border-0)",
        display: "flex", gap: 20, alignItems: "center",
      }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", fontWeight: 500 }}>
          {summary.total} patients
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          {summary.escalated > 0 && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--red)", fontWeight: 500 }}>
              ● {summary.escalated} escalated
            </span>
          )}
          <span style={{ fontSize: "var(--text-xs)", color: "var(--green)" }}>
            ● {summary.completed} completed
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-quaternary)" }}>
            ● {summary.pending} pending
          </span>
        </div>
      </div>

      {/* Patient list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <p style={{ padding: "20px 18px", fontSize: "var(--text-xs)", color: "var(--text-quaternary)" }}>
            Loading…
          </p>
        ) : ordered.length === 0 ? (
          <p style={{ padding: "20px 18px", fontSize: "var(--text-sm)", color: "var(--text-quaternary)" }}>
            No patients yet.
          </p>
        ) : (
          ordered.map(r => (
            <PatientRow
              key={r.id}
              record={r}
              calling={callingId === r.id}
              onStartCall={config => {
                setCallingId(r.id);
                onStartCall?.(config);
                window.setTimeout(() => setCallingId(null), 1400);
              }}
            />
          ))
        )}
      </div>

    </div>
  );
}
