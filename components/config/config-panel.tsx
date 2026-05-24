"use client";

import { useState, useCallback } from "react";
import { CallConfig } from "@/lib/domain/types";
import { PRESETS, PresetId, getPreset } from "@/lib/config/presets";

type ConfigTab = "patient" | "assistant" | "prompt";

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%",
  background: "var(--bg-raised)", border: "1px solid var(--border-1)",
  borderRadius: "var(--radius-md)", padding: "7px 10px",
  fontSize: "var(--text-sm)", color: "var(--text-primary)",
  outline: "none", transition: "border-color var(--speed-fast)",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "block", fontSize: "11px", fontWeight: 500,
      color: "var(--text-tertiary)", letterSpacing: "0.02em",
      textTransform: "uppercase" as const, marginBottom: 5,
    }}>
      {children}
    </span>
  );
}

function Select<T extends string>({ value, onChange, options, disabled }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as T)} disabled={disabled} style={{
      ...inputStyle, appearance: "none", paddingRight: 26,
      opacity: disabled ? 0.45 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A8A8A8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
      backgroundRepeat: "no-repeat", backgroundPosition: "right 9px center",
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function LockedNote() {
  return (
    <p style={{ margin: "0 0 12px", fontSize: "11px", color: "var(--amber)", fontWeight: 500 }}>
      Call in progress — editing disabled.
    </p>
  );
}

// ─── Sub-tab bar ──────────────────────────────────────────────────────────────

function SubTabBar({ active, onChange }: { active: ConfigTab; onChange: (t: ConfigTab) => void }) {
  const tabs: { id: ConfigTab; label: string }[] = [
    { id: "patient",   label: "Patient"   },
    { id: "assistant", label: "Assistant" },
    { id: "prompt",    label: "Prompt"    },
  ];

  return (
    <div style={{
      display: "flex", gap: 2,
      padding: "8px 16px 0",
      borderBottom: "1px solid var(--border-0)",
      flexShrink: 0,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              padding: "5px 12px 7px",
              border: "none",
              borderBottom: `2px solid ${isActive ? "var(--accent)" : "transparent"}`,
              background: "none",
              color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
              fontSize: "var(--text-sm)",
              fontWeight: isActive ? 500 : 400,
              cursor: "pointer",
              transition: "color var(--speed-fast), border-color var(--speed-fast)",
              letterSpacing: "-0.008em",
              borderRadius: 0,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Patient tab ──────────────────────────────────────────────────────────────

function PatientTab({ config, onChange, locked, activePreset, onSelectPreset }: {
  config: CallConfig;
  onChange: (c: CallConfig) => void;
  locked: boolean;
  activePreset: PresetId;
  onSelectPreset: (id: PresetId) => void;
}) {
  return (
    <div style={{ padding: "14px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {locked && <LockedNote />}

      {/* Preset pills */}
      <div>
        <Label>Preset</Label>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {PRESETS.map(p => {
            const active = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                disabled={locked}
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${active ? "var(--border-2)" : "var(--border-0)"}`,
                  background: active ? "var(--bg-active)" : "transparent",
                  cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked ? 0.45 : 1,
                  transition: "all var(--speed-fast)",
                  textAlign: "left" as const,
                }}
              >
                <div style={{ fontSize: "var(--text-sm)", fontWeight: active ? 500 : 400, color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                  {p.label}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-quaternary)", marginTop: 1 }}>
                  {p.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient context */}
      <div>
        <Label>Context</Label>
        <textarea
          value={config.patient.context}
          onChange={e => !locked && onChange({ ...config, patient: { ...config.patient, context: e.target.value } })}
          placeholder={`Name: Harsh Sharma, 28M\nAddress as: Harsh\nCondition: Hypertension, Day 5 on first prescription\nMedications:\n  - Telmisartan 40mg once daily (morning)\n  - Amlodipine 5mg once daily (morning)\nGoal: Confirm meds taken, check for dizziness/headache\nEscalate if: BP >170, chest tightness, visual disturbances`}
          rows={11}
          disabled={locked}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, opacity: locked ? 0.45 : 1 }}
        />
        <p style={{ margin: "5px 0 0", fontSize: "10px", color: "var(--text-quaternary)", lineHeight: 1.5 }}>
          Name, condition, medications, call goal, escalation triggers — injected verbatim into LLM context.
        </p>
      </div>
    </div>
  );
}

// ─── Assistant tab ────────────────────────────────────────────────────────────

function AssistantTab({ config, onChange, locked }: {
  config: CallConfig;
  onChange: (c: CallConfig) => void;
  locked: boolean;
}) {
  const set = <K extends keyof CallConfig["assistant"]>(key: K, value: CallConfig["assistant"][K]) =>
    onChange({ ...config, assistant: { ...config.assistant, [key]: value } });

  const setModel = <K extends keyof CallConfig["model"]>(key: K, value: CallConfig["model"][K]) =>
    onChange({ ...config, model: { ...config.model, [key]: value } });

  return (
    <div style={{ padding: "14px 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
      {locked && <LockedNote />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <Label>Name</Label>
          <input
            value={config.assistant.name}
            onChange={e => !locked && set("name", e.target.value)}
            placeholder="Nisha"
            disabled={locked}
            style={{ ...inputStyle, opacity: locked ? 0.45 : 1 }}
          />
        </div>
        <div>
          <Label>Voice model</Label>
          <Select
            value={config.assistant.voiceModel}
            onChange={v => set("voiceModel", v)}
            options={[
              { value: "muga",     label: "Muga (Hinglish)"   },
              { value: "mulberry", label: "Mulberry (English)" },
            ]}
            disabled={locked}
          />
        </div>
      </div>

      <div>
        <Label>Language</Label>
        <Select
          value={config.assistant.language}
          onChange={v => set("language", v)}
          options={[
            { value: "Hindi / Hinglish", label: "Hindi / Hinglish" },
            { value: "Hinglish",          label: "Hinglish"          },
            { value: "English",           label: "English"           },
          ]}
          disabled={locked}
        />
      </div>

      <div>
        <Label>Persona</Label>
        <textarea
          value={config.assistant.persona}
          onChange={e => !locked && set("persona", e.target.value)}
          placeholder="Warm, caring, speaks Hinglish naturally..."
          rows={2}
          disabled={locked}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, opacity: locked ? 0.45 : 1 }}
        />
      </div>

      {/* Model params inline */}
      <div style={{ borderTop: "1px solid var(--border-0)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <Label>LLM</Label>
            <Select
              value={config.model.llmModel}
              onChange={v => setModel("llmModel", v)}
              options={[
                { value: "gpt-4o-mini", label: "GPT-4o mini" },
                { value: "gpt-4o",      label: "GPT-4o"      },
              ]}
              disabled={locked}
            />
          </div>
          <div>
            <Label>STT</Label>
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Deepgram nova-3</span>
              <span style={{ fontSize: "10px", color: "var(--green)", fontWeight: 600 }}>live</span>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <Label>Temperature</Label>
            <span style={{ fontSize: "11px", color: "var(--accent-text)", fontWeight: 600, fontFamily: "monospace" }}>
              {config.model.temperature.toFixed(1)}
            </span>
          </div>
          <input type="range" min={0} max={1} step={0.1}
            value={config.model.temperature}
            onChange={e => !locked && setModel("temperature", parseFloat(e.target.value))}
            disabled={locked}
            style={{ width: "100%", accentColor: "var(--accent)", cursor: locked ? "not-allowed" : "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontSize: "10px", color: "var(--text-quaternary)" }}>Precise</span>
            <span style={{ fontSize: "10px", color: "var(--text-quaternary)" }}>Creative</span>
          </div>
        </div>

        <div>
          <Label>Max tokens</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="number" value={config.model.maxTokens}
              onChange={e => !locked && setModel("maxTokens", parseInt(e.target.value) || 120)}
              disabled={locked}
              style={{ ...inputStyle, width: "80px", opacity: locked ? 0.45 : 1 }}
            />
            <span style={{ fontSize: "11px", color: "var(--text-quaternary)" }}>
              ≈ {Math.round(config.model.maxTokens * 0.13)}s spoken
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt tab ───────────────────────────────────────────────────────────────

function PromptTab({ config, onChange, locked }: {
  config: CallConfig;
  onChange: (c: CallConfig) => void;
  locked: boolean;
}) {
  return (
    <div style={{ padding: "14px 18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      {locked && <LockedNote />}
      <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-quaternary)", lineHeight: 1.5 }}>
        Sent verbatim to the LLM before every turn. Patient context is appended automatically.
      </p>
      <textarea
        value={config.systemPrompt}
        onChange={e => !locked && onChange({ ...config, systemPrompt: e.target.value })}
        rows={22}
        disabled={locked}
        style={{
          ...inputStyle,
          fontFamily: '"Berkeley Mono", ui-monospace, "SF Mono", monospace',
          fontSize: "11.5px", lineHeight: 1.65, resize: "vertical",
          opacity: locked ? 0.45 : 1,
        }}
      />
    </div>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────

type ConfigPanelProps = {
  config: CallConfig;
  onChange: (c: CallConfig) => void;
  locked: boolean;
};

export function ConfigPanel({ config, onChange, locked }: ConfigPanelProps) {
  const [activeTab,   setActiveTab]   = useState<ConfigTab>("patient");
  const [activePreset, setActivePreset] = useState<PresetId>("harsh");

  const selectPreset = useCallback((id: PresetId) => {
    setActivePreset(id);
    onChange(getPreset(id));
  }, [onChange]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <SubTabBar active={activeTab} onChange={setActiveTab} />
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {activeTab === "patient" && (
          <PatientTab
            config={config}
            onChange={onChange}
            locked={locked}
            activePreset={activePreset}
            onSelectPreset={selectPreset}
          />
        )}
        {activeTab === "assistant" && (
          <AssistantTab config={config} onChange={onChange} locked={locked} />
        )}
        {activeTab === "prompt" && (
          <PromptTab config={config} onChange={onChange} locked={locked} />
        )}
      </div>
    </div>
  );
}
