"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import type { Activity, Actual, Loan, Phase, Settings } from "./types";
import { project } from "./engine";

export type SaveState = "idle" | "saving" | "saved" | "error";

export type PlanData = {
  settings: Settings | null;
  loans: Loan[];
  phases: Phase[];
  activities: Activity[];
  actuals: Actual[];
};

const EMPTY: PlanData = { settings: null, loans: [], phases: [], activities: [], actuals: [] };

export function usePlan() {
  const [data, setData] = useState<PlanData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [s, l, p, a, ac] = await Promise.all([
      supabase.from("settings").select("*").eq("id", "default").single(),
      supabase.from("loans").select("*").order("sort"),
      supabase.from("phases").select("*").order("sort"),
      supabase.from("activities").select("*").order("month_index").order("sort"),
      supabase.from("actuals").select("*").order("month_index"),
    ]);
    const first = [s, l, p, a, ac].find((r) => r.error);
    if (first?.error) {
      setError(first.error.message);
      setLoading(false);
      return;
    }
    setData({
      settings: s.data as Settings,
      loans: (l.data ?? []) as Loan[],
      phases: (p.data ?? []) as Phase[],
      activities: (a.data ?? []) as Activity[],
      actuals: (ac.data ?? []) as Actual[],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Optimistic write: change local state first, then persist. */
  const persist = useCallback(async (fn: () => Promise<{ error: { message: string } | null }>) => {
    setSave("saving");
    const { error: err } = await fn();
    if (err) {
      setSave("error");
      setError(err.message);
      return false;
    }
    setSave("saved");
    setTimeout(() => setSave((v) => (v === "saved" ? "idle" : v)), 1600);
    return true;
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      setData((d) => (d.settings ? { ...d, settings: { ...d.settings, ...patch } } : d));
      return persist(async () => supabase.from("settings").update(patch).eq("id", "default"));
    },
    [persist]
  );

  const updateLoan = useCallback(
    async (id: string, patch: Partial<Loan>) => {
      setData((d) => ({ ...d, loans: d.loans.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      return persist(async () => supabase.from("loans").update(patch).eq("id", id));
    },
    [persist]
  );

  const addLoan = useCallback(async () => {
    const sort = Math.max(0, ...data.loans.map((l) => l.sort)) + 1;
    const row = { name: "New loan", lender: "", balance: 100000, rate: 0.1, emi: 5000, sort };
    setSave("saving");
    const { data: created, error: err } = await supabase.from("loans").insert(row).select().single();
    if (err || !created) {
      setSave("error");
      setError(err?.message ?? "Could not add the loan");
      return null;
    }
    setData((d) => ({ ...d, loans: [...d.loans, created as Loan] }));
    setSave("saved");
    return created as Loan;
  }, [data.loans]);

  const deleteLoan = useCallback(
    async (id: string) => {
      setData((d) => ({ ...d, loans: d.loans.filter((x) => x.id !== id) }));
      return persist(async () => supabase.from("loans").delete().eq("id", id));
    },
    [persist]
  );

  const updateActivity = useCallback(
    async (id: string, patch: Partial<Activity>) => {
      setData((d) => ({ ...d, activities: d.activities.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      return persist(async () => supabase.from("activities").update(patch).eq("id", id));
    },
    [persist]
  );

  const addActivity = useCallback(
    async (month_index: number) => {
      const sort = Math.max(0, ...data.activities.map((a) => a.sort)) + 1;
      const row = { month_index, title: "New activity", detail: "", is_milestone: false, done: false, sort };
      setSave("saving");
      const { data: created, error: err } = await supabase.from("activities").insert(row).select().single();
      if (err || !created) {
        setSave("error");
        setError(err?.message ?? "Could not add the activity");
        return null;
      }
      setData((d) => ({ ...d, activities: [...d.activities, created as Activity] }));
      setSave("saved");
      return created as Activity;
    },
    [data.activities]
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      setData((d) => ({ ...d, activities: d.activities.filter((x) => x.id !== id) }));
      return persist(async () => supabase.from("activities").delete().eq("id", id));
    },
    [persist]
  );

  const updatePhase = useCallback(
    async (id: string, patch: Partial<Phase>) => {
      setData((d) => ({ ...d, phases: d.phases.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      return persist(async () => supabase.from("phases").update(patch).eq("id", id));
    },
    [persist]
  );

  /** One actual per month per loan; upsert keeps it idempotent. */
  const setActual = useCallback(
    async (month_index: number, loan_id: string, amount: number) => {
      setData((d) => {
        const hit = d.actuals.find((a) => a.month_index === month_index && a.loan_id === loan_id);
        if (hit) return { ...d, actuals: d.actuals.map((a) => (a === hit ? { ...a, amount } : a)) };
        return { ...d, actuals: [...d.actuals, { id: `tmp-${month_index}-${loan_id}`, month_index, loan_id, amount, note: "" }] };
      });
      setSave("saving");
      const { error: err } = await supabase
        .from("actuals")
        .upsert({ month_index, loan_id, amount }, { onConflict: "month_index,loan_id" });
      if (err) {
        setSave("error");
        setError(err.message);
        return false;
      }
      setSave("saved");
      setTimeout(() => setSave((v) => (v === "saved" ? "idle" : v)), 1600);
      return true;
    },
    []
  );

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
  };
}

export type PlanApi = ReturnType<typeof usePlan>;
