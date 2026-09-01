import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://klasshub.ng";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KlassHub — School Management Portal",
    template: "%s | KlassHub",
  },
  description:
    "Run your whole school from one portal. Results, report cards, attendance, admissions and parent communication — built for Nigerian schools.",
  keywords: [
    "school management software",
    "school portal Nigeria",
    "report card software",
    "student information system",
    "school admissions software",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "KlassHub",
    title: "KlassHub — School Management Portal",
    description:
      "Results, report cards, attendance, admissions and parent communication in one portal. Built for Nigerian schools.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KlassHub — School Management Portal",
    description:
      "Run your whole school from one portal. Built for Nigerian schools.",
  },
  robots: { index: true, follow: true },
};

/** Runs before the first paint so the page never renders in one theme and then
 *  snaps to the other. It has to be inline and synchronous for that — anything
 *  deferred is too late, and a white flash on a dark theme is exactly the kind
 *  of small thing that makes software feel cheap.
 *
 *  Wrapped in try/catch because localStorage throws outright in some privacy
 *  modes, and a theme preference is not worth a blank page. */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('kh:theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme attribute is written by the script below before React
      // hydrates, so the server markup will not match. That is the point.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-page font-sans text-ink">
        {children}
      </body>
    </html>
  );
}
