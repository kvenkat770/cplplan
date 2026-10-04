import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        surface3: "var(--surface-3)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        ink3: "var(--ink-3)",
        line: "var(--line)",
        lineStrong: "var(--line-strong)",
        signal: "var(--signal)",
        signalSoft: "var(--signal-soft)",
        good: "var(--good)",
        goodSoft: "var(--good-soft)",
        warn: "var(--warn)",
        warnSoft: "var(--warn-soft)",
        crit: "var(--crit)",
        critSoft: "var(--crit-soft)",
      },
      fontFamily: {
        display: ["Archivo", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
