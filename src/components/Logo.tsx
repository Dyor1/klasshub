/** The KlassHub mark: a gapped ring carrying three connection nodes around a
 *  bold K. Drawn as SVG so it stays crisp at any size and needs no asset.
 *  Gradient ids are static — every instance defines the same stops, so repeats
 *  on a page resolve identically. */
const ring = "kh-ring-gradient";
const letter = "kh-letter-gradient";

export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="KlassHub">
      <defs>
        <linearGradient id={ring} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={letter} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b6fe0" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      {/* Ring, broken where the nodes sit */}
      <circle
        cx="24"
        cy="24"
        r="17"
        fill="none"
        stroke={`url(#${ring})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray="20 12"
        transform="rotate(-58 24 24)"
      />

      {/* Connection nodes */}
      <circle cx="35.5" cy="12.5" r="4.6" fill="#a855f7" />
      <circle cx="7.6" cy="24" r="4.3" fill="#2563eb" />
      <circle cx="17" cy="40" r="4.3" fill="#3b82f6" />

      {/* K */}
      <g
        stroke={`url(#${letter})`}
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
  );
}

export default function Logo({
  className = "",
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="leading-none">
        <span className="block text-xl font-extrabold tracking-tight">
          <span className="text-ink">Klass</span>
          <span className="text-brand-gradient">Hub</span>
        </span>
        {showTagline && (
          <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.18em] text-ink-subtle">
            School Management Portal
          </span>
        )}
      </span>
    </span>
  );
}
