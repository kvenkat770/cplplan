"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Activity, Actual, Loan, Phase, Settings } from "./types";
import { project } from "./engine";

export type SaveState = "idle" | "saving" | "saved" | "error";

type Table = "settings" | "loans" | "phases" | "activities" | "actuals";
type Op = "update" | "insert" | "delete" | "upsert";

export type PlanData = {
  settings: Settings | null;
  loans: Loan[];
  phases: Phase[];
  activities: Activity[];
  actuals: Actual[];
};

const EMPTY: PlanData = { settings: null, loans: [], phases: [], activities: [], actuals: [] };

async function mutate(table: Table, op: Op, id: string | null, data?: unknown) {
  const res = await fetch("/api/mutate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, op, id, data }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
  return body;
}

export function usePlan() {
  const [data, setData] = useState<PlanData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not load the plan");
      setData(body as PlanData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Optimistic: update local state first, then persist; roll back on failure. */
  const run = useCallback(
    async (optimistic: (d: PlanData) => PlanData, call: () => Promise<unknown>) => {
      let previous: PlanData = EMPTY;
      setData((d) => {
        previous = d;
        return optimistic(d);
      });
      setSave("saving");
      try {
        await call();
        setSave("saved");
        setError(null);
        setTimeout(() => setSave((v) => (v === "saved" ? "idle" : v)), 1500);
        return true;
      } catch (e) {
        setData(previous);
        setSave("error");
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }
    },
    []
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      run(
        (d) => (d.settings ? { ...d, settings: { ...d.settings, ...patch } } : d),
        () => mutate("settings", "update", "default", patch)
      ),
    [run]
  );

  const updateLoan = useCallback(
    (id: string, patch: Partial<Loan>) =>
      run(
        (d) => ({ ...d, loans: d.loans.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
        () => mutate("loans", "update", id, patch)
      ),
    [run]
  );

  const addLoan = useCallback(async () => {
    const sort = Math.max(0, ...data.loans.map((l) => l.sort)) + 1;
    setSave("saving");
    try {
      const { row } = await mutate("loans", "insert", null, {
        name: "New loan", lender: "", balance: 100000, rate: 0.1, emi: 5000, sort,
      });
      setData((d) => ({ ...d, loans: [...d.loans, row as Loan] }));
      setSave("saved");
      return row as Loan;
    } catch (e) {
      setSave("error");
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [data.loans]);

  const deleteLoan = useCallback(
    (id: string) =>
      run(
        (d) => ({ ...d, loans: d.loans.filter((x) => x.id !== id) }),
        () => mutate("loans", "delete", id)
      ),
    [run]
  );

  const updateActivity = useCallback(
    (id: string, patch: Partial<Activity>) =>
      run(
        (d) => ({ ...d, activities: d.activities.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
        () => mutate("activities", "update", id, patch)
      ),
    [run]
  );

  const addActivity = useCallback(
    async (month_index: number) => {
      const sort = Math.max(0, ...data.activities.map((a) => a.sort)) + 1;
      setSave("saving");
      try {
        const { row } = await mutate("activities", "insert", null, {
          month_index, title: "New activity", detail: "", is_milestone: false, done: false, sort,
        });
        setData((d) => ({ ...d, activities: [...d.activities, row as Activity] }));
        setSave("saved");
        return row as Activity;
      } catch (e) {
        setSave("error");
        setError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [data.activities]
  );

  const deleteActivity = useCallback(
    (id: string) =>
      run(
        (d) => ({ ...d, activities: d.activities.filter((x) => x.id !== id) }),
        () => mutate("activities", "delete", id)
      ),
    [run]
  );

  const updatePhase = useCallback(
    (id: string, patch: Partial<Phase>) =>
      run(
        (d) => ({ ...d, phases: d.phases.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
        () => mutate("phases", "update", id, patch)
      ),
    [run]
  );

  const setActual = useCallback(
    (month_index: number, loan_id: string, amount: number) =>
      run(
        (d) => {
          const hit = d.actuals.find((a) => a.month_index === month_index && a.loan_id === loan_id);
          if (hit) return { ...d, actuals: d.actuals.map((a) => (a === hit ? { ...a, amount } : a)) };
          return {
            ...d,
            actuals: [...d.actuals, { id: `tmp-${month_index}-${loan_id}`, month_index, loan_id, amount, note: "" }],
          };
        },
        () => mutate("actuals", "upsert", null, { month_index, loan_id, amount })
      ),
    [run]
  );

  const signOut = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  const projection = useMemo(
    () => (data.settings ? project(data.settings, data.loans) : null),
    [data.settings, data.loans]
  );

  return {
    ...data,
    projection,
    loading,
    error,
    save,
    reload: load,
    updateSettings,
    updateLoan,
    addLoan,
    deleteLoan,
    updateActivity,
    addActivity,
    deleteActivity,
    updatePhase,
    setActual,
    signOut,
  };
}

export type PlanApi = ReturnType<typeof usePlan>;
