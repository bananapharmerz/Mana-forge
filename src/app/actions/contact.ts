"use server";

import { createHash, randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { text } from "@/lib/validate";
import { clientIp, hit, TOO_MANY } from "@/lib/rateLimit";

const CONTACT_TOPICS = ["general", "account", "premium", "bug", "legal"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Saves a contact-form message for the admin to read in Nexus. Anyone can write, signed in or not. */
export async function sendContactMessage(input: {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  website?: unknown; // honeypot: hidden from people, bots fill it in
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // A bot filled the hidden field: pretend it worked and store nothing.
  if (text(input.website, 200)) return { ok: true };

  const email = text(input.email, 254).toLowerCase();
  const name = text(input.name, 100) || null;
  const topic = CONTACT_TOPICS.includes(input.topic as ContactTopic) ? (input.topic as ContactTopic) : "general";
  // Keep line breaks in the message, but strip other control characters.
  const message = String(input.message ?? "")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, 4000);

  if (!EMAIL.test(email)) return { ok: false, error: "Please enter a valid email address so we can reply." };
  if (message.length < 10) return { ok: false, error: "Please write a little more (at least 10 characters)." };

  const ip = await clientIp();
  // At most 3 messages an hour and 10 a day from one address.
  if (!hit(`contact:h:${ip}`, 3, 60 * 60 * 1000) || !hit(`contact:d:${ip}`, 10, 24 * 60 * 60 * 1000)) {
    return { ok: false, error: TOO_MANY };
  }

  const session = await auth();
  const ipHash = createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 16);
  await db.$executeRaw`
    INSERT INTO "ContactMessage" ("id", "name", "email", "topic", "message", "userId", "ipHash", "status", "createdAt")
    VALUES (${randomUUID()}, ${name}, ${email}, ${topic}, ${message}, ${session?.user?.id ?? null}, ${ipHash}, 'open', ${new Date().toISOString()})`;
  return { ok: true };
}
