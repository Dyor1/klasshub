"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  hue: string;
  art: React.ReactNode;
};

/** Concrete rather than aspirational. "Cuts a term's marking down to an
 *  afternoon" tells a head teacher something; "empowering education" does
 *  not. */
const SLIDES: Slide[] = [
  {
    eyebrow: "Results & report cards",
    title: "A term's marking, done in an afternoon",
    body: "Enter CA and exam scores once. Grades, positions and report cards come out the other side, ready to print.",
    hue: "#38bdf8",
    art: <ReportArt />,
  },
  {
    eyebrow: "Parents & guardians",
    title: "Parents stop ringing the office",
    body: "They see attendance, results and fees themselves — and get a text the day their child is marked absent.",
    hue: "#f472b6",
    art: <ParentArt />,
  },
  {
    eyebrow: "Fees",
    title: "Know exactly who still owes",
    body: "Raise a term's invoices in one go, take card payments online, and chase the balance without a spreadsheet.",
    hue: "#fbbf24",
    art: <FeesArt />,
  },
];

const INTERVAL = 6500;

export default function AuthShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((i: number) => setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    // Someone who has asked their system to stop moving things should not be
    // handed a carousel that advances by itself.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || paused) return;

    timer.current = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <div
      className="relative flex h-full flex-col justify-between overflow-hidden bg-brand-950 px-12 py-12 xl:px-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Two washes of the current slide's colour, transitioning with it, so
          the whole panel shifts hue rather than just the artwork. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: `radial-gradient(42rem 26rem at 22% 12%, ${slide.hue}55 0%, transparent 62%), radial-gradient(34rem 22rem at 82% 88%, ${slide.hue}33 0%, transparent 60%)`,
        }}
      />

      <div className="relative flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-white/70" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
          KlassHub
        </span>
      </div>

      <div className="relative">
        <div
          className="mb-10 flex h-52 items-center justify-center"
          style={{ color: slide.hue }}
          aria-hidden="true"
        >
          {/* Keyed on the index so React remounts it and the entry animation
              replays on every slide, rather than only the first. */}
          <div key={index} className="animate-fade-in-up w-full max-w-sm">
            {slide.art}
          </div>
        </div>

        <div key={`copy-${index}`} className="animate-fade-in-up max-w-md">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: slide.hue }}
          >
            {slide.eyebrow}
          </p>
          <h2 className="mt-3 text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em] text-white xl:text-[30px]">
            {slide.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/65">{slide.body}</p>
        </div>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex gap-2" role="tablist" aria-label="Product highlights">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.eyebrow}
              onClick={() => go(i)}
              className="group py-2"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-500 ${
                  i === index ? "w-10 bg-white" : "w-5 bg-white/25 group-hover:bg-white/50"
                }`}
              />
            </button>
          ))}
        </div>

        <dl className="flex gap-8">
          {[
            ["30 days", "Free trial"],
            ["No card", "To start"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="text-sm font-bold text-white">{value}</dt>
              <dd className="mt-0.5 text-[11px] text-white/45">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Artwork. Inline SVG rather than images: no extra request, no CSP exception,
   and each piece inherits the slide's colour through currentColor.
   --------------------------------------------------------------------------- */

function ReportArt() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" fill="none">
      <rect x="18" y="14" width="216" height="172" rx="14" fill="white" fillOpacity="0.07" />
      <rect x="18" y="14" width="216" height="172" rx="14" stroke="white" strokeOpacity="0.14" />
      <rect x="38" y="36" width="86" height="9" rx="4.5" fill="white" fillOpacity="0.5" />
      <rect x="38" y="54" width="52" height="7" rx="3.5" fill="white" fillOpacity="0.22" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="38" y={82 + i * 24} width="104" height="8" rx="4" fill="white" fillOpacity="0.2" />
          <rect x={158} y={82 + i * 24} width={Math.max(18, 56 - i * 12)} height="8" rx="4" fill="currentColor" fillOpacity="0.85" />
        </g>
      ))}
      {/* The grade badge — the thing a parent looks at first. */}
      <g>
        <circle cx="258" cy="150" r="42" fill="currentColor" fillOpacity="0.16" />
        <circle cx="258" cy="150" r="30" fill="currentColor" />
        <text x="258" y="160" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0b0a2b">
          A
        </text>
      </g>
    </svg>
  );
}

function ParentArt() {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" fill="none">
      {/* A phone, because this is the thing that actually reaches a parent. */}
      <rect x="108" y="10" width="104" height="180" rx="18" fill="white" fillOpacity="0.08" />
      <rect x="108" y="10" width="104" height="180" rx="18" stroke="white" strokeOpacity="0.16" />
      <rect x="146" y="20" width="28" height="5" rx="2.5" fill="white" fillOpacity="0.25" />
      <rect x="120" y="42" width="80" height="42" rx="10" fill="currentColor" fillOpacity="0.9" />
      <rect x="130" y="54" width="44" height="6" rx="3" fill="#0b0a2b" fillOpacity="0.55" />
      <rect x="130" y="66" width="58" height="6" rx="3" fill="#0b0a2b" fillOpacity="0.35" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="120" y={96 + i * 26} width="80" height="20" rx="8" fill="white" fillOpacity="0.09" />
          <circle cx="132" cy={106 + i * 26} r="5" fill="currentColor" fillOpacity="0.7" />
          <rect x="144" y={103 + i * 26} width="44" height="5" rx="2.5" fill="white" fillOpacity="0.28" />
        </g>
      ))}
      <circle cx="62" cy="86" r="22" fill="white" fillOpacity="0.1" />
      <circle cx="62" cy="78" r="8" fill="currentColor" fillOpacity="0.8" />
      <path d="M48 98a14 14 0 0128 0z" fill="currentColor" fillOpacity="0.8" />
      <circle cx="258" cy="86" r="22" fill="white" fillOpacity="0.1" />
      <circle cx="258" cy="78" r="8" fill="white" fillOpacity="0.5" />
      <path d="M244 98a14 14 0 0128 0z" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

function FeesArt() {
  const bars = [58, 84, 46, 96, 70];
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" fill="none">
      <rect x="16" y="14" width="288" height="172" rx="14" fill="white" fillOpacity="0.06" />
      <rect x="16" y="14" width="288" height="172" rx="14" stroke="white" strokeOpacity="0.13" />
      <rect x="38" y="36" width="70" height="8" rx="4" fill="white" fillOpacity="0.45" />
      <text x="38" y="78" fontSize="30" fontWeight="800" fill="currentColor">
        ₦2.4m
      </text>
      <rect x="38" y="92" width="96" height="6" rx="3" fill="white" fillOpacity="0.2" />
      {bars.map((h, i) => (
        <g key={i}>
          <rect x={38 + i * 50} y={172 - 96} width="30" height="96" rx="8" fill="white" fillOpacity="0.08" />
          <rect x={38 + i * 50} y={172 - h} width="30" height={h} rx="8" fill="currentColor" fillOpacity={0.45 + i * 0.12} />
        </g>
      ))}
    </svg>
  );
}
