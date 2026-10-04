"use client";

import { useState } from "react";
import type { PlanApi } from "@/lib/store";
import type { Activity } from "@/lib/types";
import { monthLabel } from "@/lib/format";
import { Chevron, NumberField, Pill, Sheet, TextField } from "./ui";

function ActivitySheet({ a, api, onClose }: { a: Activity; api: PlanApi; onClose: () => void }) {
  const s = api.settings!;
  const set = (patch: Partial<Activity>) => api.updateActivity(a.id, patch);
  return (
    <Sheet
      title="Edit activity"
      subtitle={monthLabel(a.month_index, s.start_year, s.start_month, true)}
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-danger w-full justify-center"
          onClick={() => {
            if (confirm(`Delete "${a.title}"?`)) {
              api.deleteActivity(a.id);
              onClose();
            }
          }}
        >
          Delete
        </button>
      }
    >
      <TextField label="Title" value={a.title} onCommit={(v) => set({ title: v })} />
      <TextField label="Detail" value={a.detail} multiline onCommit={(v) => set({ detail: v })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Month"
          value={a.month_index}
          hint={monthLabel(a.month_index, s.start_year, s.start_month, true)}
          onCommit={(v) => set({ month_index: Math.max(0, Math.min(s.horizon_months - 1, v ?? 0)) })}
        />
        <label className="flex items-center gap-2.5 text-[13px] sm:pt-6">
          <input type="checkbox" className="tick" checked={a.is_milestone} onChange={(e) => set({ is_milestone: e.target.checked })} />
          Mark as a milestone
        </label>
      </div>
    </Sheet>
  );
}

function Item({ a, api, now, onEdit }: { a: Activity; api: PlanApi; now: number; onEdit: () => void }) {
  const s = api.settings!;
  const [open, setOpen] = useState(false);
  const isNow = a.month_index === now;

  return (
    <div className={a.is_milestone ? "bg-signalSoft" : undefined}>
      <div className="row items-start">
        <input
          type="checkbox"
          className="tick mt-0.5"
          checked={a.done}
          aria-label={`Mark "${a.title}" done`}
          onChange={(e) => api.updateActivity(a.id, { done: e.target.checked })}
        />
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span className="flex items-center gap-2 flex-wrap">
            <span className={`num text-[10.5px] uppercase tracking-wider ${a.is_milestone ? "text-signal" : "text-ink3"}`}>
              {monthLabel(a.month_index, s.start_year, s.start_month, true)}
            </span>
            {isNow && !a.done ? <Pill tone="mute">now</Pill> : null}
            {a.is_milestone ? <Pill tone="sig">milestone</Pill> : null}
          </span>
          <span className={`block text-[14.5px] font-medium leading-snug mt-0.5 ${a.done ? "line-through text-ink3" : ""}`}>{a.title}</span>
          {open && a.detail ? <span className="block text-[13px] text-ink2 leading-relaxed mt-2">{a.detail}</span> : null}
          {open ? (
            <span className="inline-block mt-2.5">
              <span className="btn btn-quiet !py-1 !px-2.5 !text-[11.5px]" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                Edit
              </span>
            </span>
          ) : null}
        </button>
        {a.detail ? <Chevron open={open} /> : null}
      </div>
    </div>
  );
}

export default function PlanTab({ api, now }: { api: PlanApi; now: number }) {
  const s = api.settings!;
  const [editing, setEditing] = useState<Activity | null>(null);

  const done = api.activities.filter((a) => a.done).length;
  const total = api.activities.length;
  const live = editing ? api.activities.find((x) => x.id === editing.id) ?? editing : null;

  const covered = new Set<string>();
  api.phases.forEach((p) =>
    api.activities.forEach((a) => {
      if (a.month_index >= p.from_month && a.month_index <= p.to_month) covered.add(a.id);
    })
  );
  const orphans = api.activities.filter((a) => !covered.has(a.id)).sort((a, b) => a.month_index - b.month_index);

  return (
    <div className="flex flex-col gap-7">
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-display text-[20px] font-bold">Flight plan</h1>
          <span className="num text-[13px] text-ink3">
            {done}/{total}
          </span>
        </div>
        <div className="h-1.5 bg-surface3 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-good rounded-full transition-[width]" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </section>

      {api.phases.map((ph) => {
        const items = api.activities
          .filter((a) => a.month_index >= ph.from_month && a.month_index <= ph.to_month)
          .sort((a, b) => a.month_index - b.month_index || a.sort - b.sort);
        const phDone = items.filter((a) => a.done).length;
        return (
          <section key={ph.id} className="flex flex-col gap-2.5">
            <div className="flex items-baseline gap-2.5">
              <span className="sect text-signal">{ph.label}</span>
              <span className="num text-[11px] text-ink3 ml-auto">
                {phDone}/{items.length}
              </span>
            </div>
            <h2 className="font-display text-[17px] font-bold -mt-1.5">{ph.title}</h2>
            <p className="num text-[11.5px] text-ink3 -mt-1.5">
              {monthLabel(ph.from_month, s.start_year, s.start_month, true)}
              {ph.from_month !== ph.to_month ? ` – ${monthLabel(ph.to_month, s.start_year, s.start_month, true)}` : ""}
            </p>
            <div className="group">
              {items.map((a) => (
                <Item key={a.id} a={a} api={api} now={now} onEdit={() => setEditing(a)} />
              ))}
              <button type="button" className="row text-ink3 text-[13px]" onClick={() => api.addActivity(ph.from_month)}>
                + Add an activity
              </button>
            </div>
          </section>
        );
      })}

      {orphans.length ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="sect">Outside every phase</h2>
          <p className="text-[12.5px] text-ink3">These sit in months no phase covers. Widen a phase, or move the activity.</p>
          <div className="group">
            {orphans.map((a) => (
              <Item key={a.id} a={a} api={api} now={now} onEdit={() => setEditing(a)} />
            ))}
          </div>
        </section>
      ) : null}

      {live ? <ActivitySheet a={live} api={api} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
