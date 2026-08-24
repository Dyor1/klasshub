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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-slate-800">
        {children}
      </body>
    </html>
  );
}
