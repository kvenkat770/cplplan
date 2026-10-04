"use client";

import { useEffect, useRef, useState } from "react";

/* ---------------- pills and stats ---------------- */

export type Tone = "good" | "warn" | "crit" | "sig" | "mute";

const TONE: Record<Tone, string> = {
  good: "bg-goodSoft text-good",
  warn: "bg-warnSoft text-warn",
  crit: "bg-critSoft text-crit",
  sig: "bg-signalSoft text-signal",
  mute: "bg-surface3 text-ink2",
};

export function Pill({ tone = "mute", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`pill ${TONE[tone]}`}>{children}</span>;
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line rounded-[10px] overflow-hidden">
      {children}
    </div>
  );
}

export function Stat({ k, v, s, lift }: { k: string; v: string; s?: string; lift?: boolean }) {
  return (
    <div className="bg-surface px-[13px] py-3 flex flex-col gap-[3px]">
      <span className="text-[10.5px] font-semibold tracking-[0.09em] uppercase text-ink3">{k}</span>
      <span className={`num text-[21px] font-medium leading-tight tracking-tight ${lift ? "text-signal" : ""}`}>{v}</span>
      {s ? <span className="text-[11.5px] text-ink3">{s}</span> : null}
    </div>
  );
}

/* ---------------- editable fields ----------------
   Inputs keep their own draft string so you can type freely;
   the value is committed on blur or Enter.                      */

function useDraft(value: string) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return { draft, setDraft, focused };
}

export function NumberField({
  label,
  value,
  onCommit,
  step = 1,
  suffix,
  hint,
  nullable,
}: {
  label?: string;
  value: number | null;
  onCommit: (v: number | null) => void;
  step?: number;
  suffix?: string;
  hint?: string;
  nullable?: boolean;
}) {
  const { draft, setDraft, focused } = useDraft(value == null ? "" : String(value));
  const commit = () => {
    focused.current = false;
    const t = draft.trim();
    if (t === "") {
      if (nullable) onCommit(null);
      else setDraft(String(value ?? 0));
      return;
    }
    const nv = Number(t);
    if (!isFinite(nv)) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    onCommit(nv);
  };
  return (
    <label className="block">
      {label ? <span className="lbl">{label}</span> : null}
      <span className="relative flex items-center">
        <input
          className="field"
          inputMode="decimal"
          step={step}
          value={draft}
          placeholder={nullable ? "none" : undefined}
          onFocus={() => (focused.current = true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(value == null ? "" : String(value));
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {suffix ? <span className="absolute right-2 text-[11px] text-ink3 pointer-events-none">{suffix}</span> : null}
      </span>
      {hint ? <span className="block text-[11px] text-ink3 mt-1">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  value,
  onCommit,
  multiline,
  placeholder,
}: {
  label?: string;
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const { draft, setDraft, focused } = useDraft(value);
  const commit = () => {
    focused.current = false;
    if (draft !== value) onCommit(draft);
  };
  const shared = {
    className: "field field-text",
    value: draft,
    placeholder,
    onFocus: () => (focused.current = true),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: commit,
  };
  return (
    <label className="block">
      {label ? <span className="lbl">{label}</span> : null}
      {multiline ? <textarea rows={3} {...shared} /> : <input {...shared} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />}
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[12.5px] font-semibold">{label}</span>
        <span className="num text-[14px] font-medium text-signal">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <span className="text-[11.5px] text-ink3">{hint}</span> : null}
    </div>
  );
}

/* ---------------- charts ---------------- */

type Pad = { l: number; r: number; t: number; b: number };

function linePath(vals: number[], w: number, h: number, pad: Pad, maxV: number) {
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  return vals
    .map((v, i) => {
      const x = pad.l + (vals.length === 1 ? 0 : (i / (vals.length - 1)) * iw);
      const y = pad.t + ih - (v / maxV) * ih;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaPath(vals: number[], w: number, h: number, pad: Pad, maxV: number) {
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  return `${linePath(vals, w, h, pad, maxV)} L${(pad.l + iw).toFixed(1)} ${(pad.t + ih).toFixed(1)} L${pad.l.toFixed(1)} ${(pad.t + ih).toFixed(1)} Z`;
}

export function LineChart({
  series,
  labels,
  fmt,
  marker,
  markerLabel,
  ariaLabel,
}: {
  series: { values: number[]; color: string; fill?: string; width?: number; endLabel?: boolean }[];
  labels: (i: number) => string;
  fmt: (v: number) => string;
  marker?: number;
  markerLabel?: string;
  ariaLabel: string;
}) {
  const w = 680;
  const h = 230;
  const pad: Pad = { l: 48, r: 54, t: 16, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const n = series[0]?.values.length ?? 0;
  if (!n) return null;
  const all = series.flatMap((s) => s.values);
  const maxV = Math.max(1, Math.ceil(Math.max(...all) / 1e6) * 1e6);
  const ticks = [0, 1, 2, 3, 4];
  const xTicks = Array.from(new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} className="block max-w-full">
      {ticks.map((g) => {
        const y = pad.t + ih - (g / 4) * ih;
        return (
          <g key={g}>
            <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 7} y={y + 3.5} textAnchor="end" fill="var(--ink-3)" fontSize={9.5} fontFamily="IBM Plex Mono, monospace">
              {fmt((maxV * g) / 4)}
            </text>
          </g>
        );
      })}
      {marker != null && marker >= 0 && marker < n ? (
        <g>
          <line
            x1={pad.l + (marker / (n - 1)) * iw}
            y1={pad.t}
            x2={pad.l + (marker / (n - 1)) * iw}
            y2={pad.t + ih}
            stroke="var(--signal)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          {markerLabel ? (
            <text x={pad.l + (marker / (n - 1)) * iw + 4} y={pad.t + 10} fill="var(--signal)" fontSize={9} fontWeight={700} fontFamily="Archivo, sans-serif">
              {markerLabel}
            </text>
          ) : null}
        </g>
      ) : null}
      {series.map((s, idx) =>
        s.fill ? <path key={`f${idx}`} d={areaPath(s.values, w, h, pad, maxV)} fill={s.fill} stroke="none" /> : null
      )}
      {series.map((s, idx) => (
        <path key={`l${idx}`} d={linePath(s.values, w, h, pad, maxV)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} />
      ))}
      {series.map((s, idx) => {
        if (!s.endLabel) return null;
        const y = pad.t + ih - (s.values[n - 1] / maxV) * ih;
        return (
          <g key={`e${idx}`}>
            <circle cx={pad.l + iw} cy={y} r={3.5} fill={s.color} />
            <text x={pad.l + iw + 6} y={y + 3.5} fill={s.color} fontSize={9.5} fontWeight={600} fontFamily="IBM Plex Mono, monospace">
              {fmt(s.values[n - 1])}
            </text>
          </g>
        );
      })}
      {xTicks.map((i) => (
        <text
          key={i}
          x={pad.l + (i / (n - 1)) * iw}
          y={h - 9}
          textAnchor="middle"
          fill="var(--ink-3)"
          fontSize={9.5}
          fontFamily="IBM Plex Mono, monospace"
        >
          {labels(i)}
        </text>
      ))}
    </svg>
  );
}

export function BarChart({
  values,
  highlight,
  labels,
  fmt,
  ariaLabel,
}: {
  values: number[];
  highlight: boolean[];
  labels: (i: number) => string;
  fmt: (v: number) => string;
  ariaLabel: string;
}) {
  const w = 680;
  const h = 185;
  const pad: Pad = { l: 48, r: 14, t: 14, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const n = values.length;
  if (!n) return null;
  const maxV = Math.max(1, Math.ceil(Math.max(...values) / 25000) * 25000);
  const bw = (iw / n) * 0.66;
  const xTicks = Array.from(new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} className="block max-w-full">
      {[0, 1, 2, 3, 4].map((g) => {
        const y = pad.t + ih - (g / 4) * ih;
        return (
          <g key={g}>
            <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 7} y={y + 3.5} textAnchor="end" fill="var(--ink-3)" fontSize={9.5} fontFamily="IBM Plex Mono, monospace">
              {fmt((maxV * g) / 4)}
            </text>
          </g>
        );
      })}
      {values.map((v, i) => {
        const x = pad.l + (i / Math.max(1, n - 1)) * (iw - bw);
        const bh = Math.max(1, (Math.max(0, v) / maxV) * ih);
        return (
          <rect
            key={i}
            x={x}
            y={pad.t + ih - bh}
            width={bw}
            height={bh}
            rx={2}
            fill={highlight[i] ? "var(--signal)" : "var(--ink-3)"}
          />
        );
      })}
      {xTicks.map((i) => (
        <text
          key={i}
          x={pad.l + (i / Math.max(1, n - 1)) * (iw - bw) + bw / 2}
          y={h - 9}
          textAnchor="middle"
          fill="var(--ink-3)"
          fontSize={9.5}
          fontFamily="IBM Plex Mono, monospace"
        >
          {labels(i)}
        </text>
      ))}
    </svg>
  );
}
