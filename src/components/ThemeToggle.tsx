"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Reads the attribute the inline boot script already set rather than deciding
 *  again — two places choosing a theme is how you get a flicker. */
export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("kh:theme", next);
    } catch {
      // Private browsing. The theme still applies for this session.
    }
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-hover hover:text-ink ${
        collapsed ? "w-full justify-center px-2.5" : "w-full"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        {/* Rendered only once mounted, so the server never guesses which icon
            belongs to a theme it cannot know. */}
        {ready && theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
      {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
