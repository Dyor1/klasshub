import { ImageResponse } from "next/og";

export const alt = "KlassHub — school management portal for Nigerian schools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card that appears when someone pastes a KlassHub link into WhatsApp,
 *  which is how school administrators actually share things.
 *
 *  `twitter.card` was already set to summary_large_image in the root layout,
 *  so the site was promising a large image and shipping none — a grey box with
 *  a URL under it. This is the image.
 *
 *  Deliberately no external font fetch. A remote font makes the image a
 *  network call that can fail at exactly the moment a link is being shared,
 *  and the fallback is worse than a system face. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0a2b",
          padding: 80,
        }}
      >
        {/* Brand glow, matching the call-to-action band on the homepage. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(700px 380px at 12% 0%, rgba(79,70,229,0.55) 0%, transparent 65%), radial-gradient(600px 320px at 92% 100%, rgba(168,85,247,0.42) 0%, transparent 65%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 48 48">
            <defs>
              <linearGradient id="ring" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="55%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle
              cx="24"
              cy="24"
              r="17"
              fill="none"
              stroke="url(#ring)"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray="20 12"
              transform="rotate(-58 24 24)"
            />
            <circle cx="35.5" cy="12.5" r="4.6" fill="#a855f7" />
            <circle cx="7.6" cy="24" r="4.3" fill="#2563eb" />
            <circle cx="17" cy="40" r="4.3" fill="#3b82f6" />
            <g
              stroke="#c7d2fe"
              strokeWidth="4.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              <path d="M19 13.5 V34.5" />
              <path d="M19 24.5 L30.5 13.8" />
              <path d="M19 24.5 L31 35.4" />
            </g>
          </svg>
          <span style={{ fontSize: 44, fontWeight: 800, color: "white", letterSpacing: -1 }}>
            KlassHub
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            Run your whole school from one portal
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.66)", marginTop: 26 }}>
            Results · Report cards · Attendance · Fees · Parent portals
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 24, color: "rgba(255,255,255,0.5)" }}>klasshub.ng</span>
          <span style={{ fontSize: 24, color: "rgba(255,255,255,0.3)" }}>•</span>
          <span style={{ fontSize: 24, color: "rgba(255,255,255,0.5)" }}>
            Built for Nigerian schools
          </span>
        </div>
      </div>
    ),
    size
  );
}
