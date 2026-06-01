"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    // prefer cookie for SSR consistency
    const cookieMatch = document.cookie.match(/(?:^|; )theme=(light|dark)(?:;|$)/);
    if (cookieMatch && (cookieMatch[1] === "light" || cookieMatch[1] === "dark")) return cookieMatch[1] as "light" | "dark";
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored as "light" | "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
      // also persist in a cookie so the server can read it on SSR
      document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch {
      // ignore
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      className={styles.themeToggleButton}
      aria-label={"Switch mode" }
      onClick={toggle}
      type="button"
      title={`Theme: ${theme}`}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path className={styles.sunRays} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M18.364 18.364l-1.414-1.414M7.05 7.05L5.636 5.636" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path className={styles.moon} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle className={styles.sunCore} cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </button>
  );
}
