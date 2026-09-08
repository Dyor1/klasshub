// Input rules for the contact form, kept apart from index.ts so they can be
// tested without starting a server — the same reason internalPath lives on its
// own. These are the security-relevant part of the function: everything past
// here reaches the database and an outbound email.

export const TOPICS = ["sales", "support", "privacy", "security", "other"] as const;
export type Topic = (typeof TOPICS)[number];

export const TOPIC_LABEL: Record<Topic, string> = {
  sales: "Sales enquiry",
  support: "Support",
  privacy: "Privacy / data request",
  security: "Security report",
  other: "General",
};

export type Submission = {
  name: string;
  email: string;
  topic: Topic;
  message: string;
};

export type Checked =
  | { ok: true; value: Submission }
  | { ok: false; error: string }
  | { ok: false; silent: true };

export type Body = {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  website?: unknown;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bounds match the CHECK constraints on contact_messages. If they ever drift
 *  the database refuses the insert, so the failure is loud rather than a
 *  truncated message — but keeping them in step means the person writing in
 *  gets a sentence they can act on instead of a 500. */
export function validate(b: Body): Checked {
  // Honeypot: hidden from people, filled by bots. Accepted silently so whoever
  // submitted learns nothing about why nothing happened — an error here just
  // tells a bot author which field to leave alone next time.
  if (String(b.website ?? "").trim() !== "") return { ok: false, silent: true };

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const topic = String(b.topic ?? "").trim();
  const message = String(b.message ?? "").trim();

  if (name.length < 2 || name.length > 100) {
    return { ok: false, error: "Tell us your name." };
  }
  // Deliberately loose. Anything stricter rejects real addresses, and the only
  // way to know an address works is to send to it.
  if (email.length > 254 || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "That email address does not look right." };
  }
  if (!(TOPICS as readonly string[]).includes(topic)) {
    return { ok: false, error: "Choose what your message is about." };
  }
  if (message.length < 10 || message.length > 5000) {
    return { ok: false, error: "Your message should be between 10 and 5000 characters." };
  }

  return { ok: true, value: { name, email, topic: topic as Topic, message } };
}
