"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not sign in.");
      setPassword("");
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-[320px] flex flex-col gap-5">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Runway</h1>
          <p className="text-[13.5px] text-ink3 mt-1">Debt and CPL plan, Oct 2026 to Oct 2028.</p>
        </div>

        <label className="block">
          <span className="lbl">Password</span>
          <input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error ? <p className="text-[12.5px] text-crit">{error}</p> : null}

        <button type="submit" className="btn btn-primary w-full justify-center" disabled={busy || !password}>
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
