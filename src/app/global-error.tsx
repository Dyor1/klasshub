"use client";

import { useEffect } from "react";

/** The last resort: an error thrown in the root layout itself, which error.tsx
 *  cannot catch because it lives inside that layout.
 *
 *  This replaces the whole document, so it renders its own <html> and <body>
 *  and cannot rely on globals.css having loaded — which is exactly the failure
 *  it might be reporting. Hence inline styles and no imports beyond React, and
 *  hence colours that are readable on their own rather than design tokens. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#faf9f7",
          color: "#201d1a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
          KlassHub could not load
        </h1>
        <p style={{ margin: 0, maxWidth: 420, lineHeight: 1.6, color: "#5c5349" }}>
          Something failed before the page could start. Your school&apos;s
          records are unaffected. Reloading usually fixes it.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            height: 48,
            padding: "0 28px",
            border: 0,
            borderRadius: 12,
            background: "#4f46e5",
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
        {error.digest && (
          <p style={{ margin: 0, fontSize: 13, color: "#8d8375" }}>
            Reference: <code>{error.digest}</code>
          </p>
        )}
      </body>
    </html>
  );
}
