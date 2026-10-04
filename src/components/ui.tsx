"use client";

import { useEffect, useRef, useState } from "react";

/* ---------------- atoms ---------------- */

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

export function Chevron({ open }: { open?: boolean }) {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={open ? { transform: "rotate(90deg)" } : undefined}>
      <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A labelled figure. Compact by default; `hero` for the one number that leads a screen. */
export function Figure({ label, value, sub, tone, hero }: { label: string; value: string; sub?: string; tone?: "signal"; hero?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="sect">{label}</span>
      <span
        className={`num font-medium leading-none tracking-tight ${hero ? "text-[40px] sm:text-[48px]" : "text-[19px]"} ${
          tone === "signal" ? "text-signal" : ""
        }`}
      >
        {value}
      </span>
      {sub ? <span className="text-[12px] text-ink3 mt-1">{sub}</span> : null}
    </div>
  );
}

/* ---------------- sheet ---------------- */

export function Sheet({ title, subtitle, onClose, children, footer }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-line">
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-[17px] truncate">{title}</h2>
            {subtitle ? <p className="text-[12.5px] text-ink3 mt-0.5">{subtitle}</p> : null}
          </div>
          <button type="button" className="btn btn-quiet !px-2.5 !py-1.5" onClick={onClose} aria-label="Close">
            Done
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">{children}</div>
        {footer ? <div className="px-5 py-3 border-t border-line">{footer}</div> : null}
      </div>
    </>
  );
}

/** A collapsible block. Used to keep long forms from becoming a wall. */
export function Fold({ title, hint, defaultOpen, children }: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="group">
      <button type="button" className="row" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-[14px]">{title}</span>
          {hint ? <span className="block text-[12px] text-ink3 mt-0.5">{hint}</span> : null}
        </span>
        <Chevron open={open} />
      </button>
      {open ? <div className="px-[15px] py-4">{children}</div> : null}
    </div>
  );
}

/* ---------------- fields ---------------- */

function useDraft(value: string) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return { draft, setDraft, focused };
}

export function NumberField({ label, value, onCommit, step = 1, hint, nullable }: {
  label?: string;
  value: number | null;
  onCommit: (v: number | null) => void;
  step?: number;
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
      {hint ? <span className="block text-[11.5px] text-ink3 mt-1">{hint}</span> : null}
    </label>
  );
}

export function TextField({ label, value, onCommit, multiline, placeholder }: {
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
      {multiline ? (
        <textarea rows={4} {...shared} />
      ) : (
        <input {...shared} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      )}
    </label>
  );
}

export function Slider({ label, value, min, max, step, display, hint, onChange }: {
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
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline gap-3">
        <span className="text-[13px] font-medium">{label}</span>
        <span className="num text-[14px] font-semibold text-signal">{display}</span>
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
      {hint ? <span className="text-[11.5px] text-ink3 -mt-0.5">{hint}</span> : null}
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

/** A tiny inline trend line, no axes — for sitting under a hero number. */
export function Spark({ values, color = "var(--signal)", height = 38 }: { values: number[]; color?: string; height?: number }) {
  const w = 300;
  const h = height;
  const pad: Pad = { l: 1, r: 1, t: 3, b: 3 };
  if (values.length < 2) return null;
  const maxV = Math.max(...values, 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
      <path d={areaPath(values, w, h, pad, maxV)} fill={color} opacity={0.1} />
      <path d={linePath(values, w, h, pad, maxV)} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function LineChart({ series, labels, fmt, marker, markerLabel, ariaLabel }: {
  series: { values: number[]; color: string; fill?: string; width?: number; endLabel?: boolean }[];
  labels: (i: number) => string;
  fmt: (v: number) => string;
  marker?: number;
  markerLabel?: string;
  ariaLabel: string;
}) {
  const w = 680;
  const h = 210;
  const pad: Pad = { l: 46, r: 52, t: 14, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const n = series[0]?.values.length ?? 0;
  if (!n) return null;
  const maxV = Math.max(1, Math.ceil(Math.max(...series.flatMap((s) => s.values)) / 1e6) * 1e6);
  const xTicks = Array.from(new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} className="block max-w-full">
      {[0, 1, 2, 3, 4].map((g) => {
        const y = pad.t + ih - (g / 4) * ih;
        return (
          <g key={g}>
            <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 8} y={y + 3.5} textAnchor="end" fill="var(--ink-3)" fontSize={9.5} fontFamily="IBM Plex Mono, monospace">
              {fmt((maxV * g) / 4)}
            </text>
          </g>
        );
      })}
      {marker != null && marker >= 0 && marker < n ? (
        <g>
          <line x1={pad.l + (marker / (n - 1)) * iw} y1={pad.t} x2={pad.l + (marker / (n - 1)) * iw} y2={pad.t + ih} stroke="var(--signal)" strokeWidth={1} strokeDasharray="3 3" />
          {markerLabel ? (
            <text x={pad.l + (marker / (n - 1)) * iw + 4} y={pad.t + 9} fill="var(--signal)" fontSize={8.5} fontWeight={700} fontFamily="Archivo, sans-serif">
              {markerLabel}
            </text>
          ) : null}
        </g>
      ) : null}
      {series.map((s, i) => (s.fill ? <path key={`f${i}`} d={areaPath(s.values, w, h, pad, maxV)} fill={s.fill} /> : null))}
      {series.map((s, i) => (
        <path key={`l${i}`} d={linePath(s.values, w, h, pad, maxV)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeLinejoin="round" />
      ))}
      {series.map((s, i) => {
        if (!s.endLabel) return null;
        const y = pad.t + ih - (s.values[n - 1] / maxV) * ih;
        return (
          <g key={`e${i}`}>
            <circle cx={pad.l + iw} cy={y} r={3} fill={s.color} />
            <text x={pad.l + iw + 6} y={y + 3.5} fill={s.color} fontSize={9.5} fontWeight={600} fontFamily="IBM Plex Mono, monospace">
              {fmt(s.values[n - 1])}
            </text>
          </g>
        );
      })}
      {xTicks.map((i) => (
        <text key={i} x={pad.l + (i / (n - 1)) * iw} y={h - 8} textAnchor="middle" fill="var(--ink-3)" fontSize={9.5} fontFamily="IBM Plex Mono, monospace">
          {labels(i)}
        </text>
      ))}
    </svg>
  );
}

export function BarChart({ values, highlight, labels, fmt, ariaLabel }: {
  values: number[];
  highlight: boolean[];
  labels: (i: number) => string;
  fmt: (v: number) => string;
  ariaLabel: string;
}) {
  const w = 680;
  const h = 170;
  const pad: Pad = { l: 46, r: 12, t: 12, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const n = values.length;
  if (!n) return null;
  const maxV = Math.max(1, Math.ceil(Math.max(...values) / 25000) * 25000);
  const bw = (iw / n) * 0.62;
  const xTicks = Array.from(new Set([0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={ariaLabel} className="block max-w-full">
      {[0, 2, 4].map((g) => {
        const y = pad.t + ih - (g / 4) * ih;
        return (
          <g key={g}>
            <line x1={pad.l} y1={y} x2={pad.l + iw} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 8} y={y + 3.5} textAnchor="end" fill="var(--ink-3)" fontSize={9.5} fontFamily="IBM Plex Mono, monospace">
              {fmt((maxV * g) / 4)}
            </text>
          </g>
        );
      })}
      {values.map((v, i) => {
        const x = pad.l + (i / Math.max(1, n - 1)) * (iw - bw);
        const bh = Math.max(1.5, (Math.max(0, v) / maxV) * ih);
        return <rect key={i} x={x} y={pad.t + ih - bh} width={bw} height={bh} rx={2} fill={highlight[i] ? "var(--signal)" : "var(--line-strong)"} />;
      })}
      {xTicks.map((i) => (
        <text key={i} x={pad.l + (i / Math.max(1, n - 1)) * (iw - bw) + bw / 2} y={h - 8} textAnchor="middle" fill="var(--ink-3)" fontSize={9.5} fontFamily="IBM Plex Mono, monospace">
          {labels(i)}
        </text>
      ))}
    </svg>
  );
}
