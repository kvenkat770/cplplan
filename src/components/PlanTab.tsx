"use client";

import { useState } from "react";
import type { PlanApi } from "@/lib/store";
import type { Activity, Phase } from "@/lib/types";
import { monthLabel } from "@/lib/format";
import { NumberField, Pill, TextField } from "./ui";

function ActivityCard({ a, api, now }: { a: Activity; api: PlanApi; now: number }) {
  const [open, setOpen] = useState(false);
  const s = api.settings!;
  const isNow = a.month_index === now;

  return (
    <div
      className={`rounded-[10px] border bg-surface px-3 py-[11px] ${
        a.is_milestone ? "border-signal bg-signalSoft shadow-[inset_3px_0_0_var(--signal)]" : isNow && !a.done ? "border-ink shadow-[inset_3px_0_0_var(--ink)]" : "border-line"
      } ${a.done ? "opacity-60" : ""}`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 items-start">
        <input
          type="checkbox"
          checked={a.done}
          aria-label={`Mark "${a.title}" done`}
          onChange={(e) => api.updateActivity(a.id, { done: e.target.checked })}
          className="w-[19px] h-[19px] mt-0.5 accent-[var(--good)] cursor-pointer"
        />
        <div className="min-w-0">
          <div className={`num text-[10.5px] font-medium tracking-[0.06em] uppercase ${a.is_milestone ? "text-signal" : "text-ink3"}`}>
            {monthLabel(a.month_index, s.start_year, s.start_month, true)}
            {isNow ? " · this month" : ""}
          </div>
          <div className={`font-semibold text-[14.5px] ${a.done ? "line-through decoration-ink3" : ""}`}>{a.title}</div>
          {a.detail ? <div className="text-[13px] text-ink2 mt-0.5">{a.detail}</div> : null}
        </div>
        <button type="button" className="btn !px-2 !py-1 text-[11px]" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Done" : "Edit"}
        </button>
      </div>

      {open ? (
        <div className="grid gap-3 sm:grid-cols-2 mt-3 pt-3 border-t border-line">
          <TextField label="Title" value={a.title} onCommit={(v) => api.updateActivity(a.id, { title: v })} />
          <NumberField
            label="Month index"
            value={a.month_index}
            hint={monthLabel(a.month_index, s.start_year, s.start_month, true)}
            onCommit={(v) => api.updateActivity(a.id, { month_index: v ?? 0 })}
          />
          <div className="sm:col-span-2">
            <TextField label="Detail" value={a.detail} multiline onCommit={(v) => api.updateActivity(a.id, { detail: v })} />
          </div>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={a.is_milestone}
              onChange={(e) => api.updateActivity(a.id, { is_milestone: e.target.checked })}
              className="w-4 h-4 accent-[var(--signal)]"
            />
            This is a milestone
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`Delete "${a.title}"?`)) api.deleteActivity(a.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PhaseBlock({ phase, api, now }: { phase: Phase; api: PlanApi; now: number }) {
  const [edit, setEdit] = useState(false);
  const s = api.settings!;
  const items = api.activities
    .filter((a) => a.month_index >= phase.from_month && a.month_index <= phase.to_month)
    .sort((a, b) => a.month_index - b.month_index || a.sort - b.sort);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2.5 flex-wrap pb-1 border-b-2 border-ink">
        <span className="font-display font-bold text-[12px] tracking-[0.08em] text-signal uppercase">{phase.label}</span>
        <span className="font-display font-bold text-[18px] tracking-tight">{phase.title}</span>
        <span className="num text-[12px] text-ink3 ml-auto">
          {monthLabel(phase.from_month, s.start_year, s.start_month, true)} – {monthLabel(phase.to_month, s.start_year, s.start_month, true)}
        </span>
        <button type="button" className="btn !px-2 !py-1 text-[11px]" onClick={() => setEdit((v) => !v)}>
          {edit ? "Done" : "Edit"}
        </button>
      </div>

      {edit ? (
        <div className="card p-3 grid gap-3 sm:grid-cols-4">
          <TextField label="Label" value={phase.label} onCommit={(v) => api.updatePhase(phase.id, { label: v })} />
          <div className="sm:col-span-3">
            <TextField label="Title" value={phase.title} onCommit={(v) => api.updatePhase(phase.id, { title: v })} />
          </div>
          <NumberField label="From month" value={phase.from_month} onCommit={(v) => api.updatePhase(phase.id, { from_month: v ?? 0 })} />
          <NumberField label="To month" value={phase.to_month} onCommit={(v) => api.updatePhase(phase.id, { to_month: v ?? 0 })} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {items.map((a) => (
          <ActivityCard key={a.id} a={a} api={api} now={now} />
        ))}
        <button type="button" className="btn self-start" onClick={() => api.addActivity(phase.from_month)}>
          + Add to {phase.label}
        </button>
      </div>
    </div>
  );
}

export default function PlanTab({ api, now }: { api: PlanApi; now: number }) {
  const s = api.settings!;
  const done = api.activities.filter((a) => a.done).length;
  const total = api.activities.length;

  const covered = new Set<string>();
  api.phases.forEach((p) =>
    api.activities.forEach((a) => {
      if (a.month_index >= p.from_month && a.month_index <= p.to_month) covered.add(a.id);
    })
  );
  const orphans = api.activities.filter((a) => !covered.has(a.id));

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <h2 className="font-display font-bold text-[20px]">
          {total} activities, {api.activities.filter((a) => a.is_milestone).length} milestones
        </h2>
        <p className="text-[14px] text-ink2 max-w-[62ch]">
          Tick things off as you do them, edit the wording, move them between months, or add your own. Everything saves to Supabase.
        </p>
        <div className="mt-2.5">
          <Pill tone={done === total && total > 0 ? "good" : done ? "sig" : "mute"}>
            {done} of {total} done
          </Pill>
        </div>
      </div>

      <div className="flex flex-col gap-[26px]">
        {api.phases.map((p) => (
          <PhaseBlock key={p.id} phase={p} api={api} now={now} />
        ))}
      </div>

      {orphans.length ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline gap-2.5 pb-1 border-b-2 border-ink">
            <span className="font-display font-bold text-[18px] tracking-tight">Outside every phase</span>
            <span className="num text-[12px] text-ink3 ml-auto">{orphans.length}</span>
          </div>
          <p className="text-[13px] text-ink2">
            These sit in months no phase covers. Widen a phase above, or move the activity.
          </p>
          {orphans.map((a) => (
            <ActivityCard key={a.id} a={a} api={api} now={now} />
          ))}
        </div>
      ) : null}

      <p className="text-[12px] text-ink3">
        Month 0 is {monthLabel(0, s.start_year, s.start_month, true)}. Month {s.horizon_months - 1} is{" "}
        {monthLabel(s.horizon_months - 1, s.start_year, s.start_month, true)}.
      </p>
    </div>
  );
}
