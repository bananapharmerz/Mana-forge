// DSA statement of reasons (Art. 17): when we restrict a piece of public content — a feed post, a
// comment, or a public deck — the person who posted it is told what we did, why, and how to appeal.
// Best-effort and never throws: moderation must succeed even if the email can't be sent (e.g. no
// RESEND_API_KEY, or the author has no email on file).

import { db } from "@/lib/db";
import { emailHtml, esc, sendEmail } from "@/lib/email";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

export type ModerationReason = "spam" | "offensive" | "copyright" | "illegal" | "sexual" | "other";

const REASON_LABEL: Record<string, string> = {
  spam: "spam, advertising or misuse of the site",
  offensive: "hateful, harassing or offensive content",
  copyright: "a copyright or other intellectual-property concern",
  illegal: "content that may be unlawful",
  sexual: "sexual content",
  other: "a breach of our content rules",
};

type Kind = "post" | "comment" | "deck";
type Action = "hidden" | "removed";

const actionPhrase = (kind: Kind, action: Action): string => {
  if (kind === "deck") return action === "removed" ? "removed from the site" : "made private (unlisted from public decks)";
  return action === "removed" ? "removed from the community feed" : "hidden from the community feed";
};

async function resolveTarget(kind: Kind, id: string): Promise<{ email: string; name: string | null; what: string } | null> {
  if (kind === "deck") {
    const d = await db.deck.findUnique({ where: { id }, select: { name: true, commanderName: true, owner: { select: { email: true, name: true } } } });
    if (!d?.owner?.email) return null;
    return { email: d.owner.email, name: d.owner.name, what: `your public deck “${d.name}”${d.commanderName ? ` (${d.commanderName})` : ""}` };
  }
  if (kind === "post") {
    const p = await db.post.findUnique({ where: { id }, select: { kind: true, author: { select: { email: true, name: true } } } });
    if (!p?.author?.email) return null;
    return { email: p.author.email, name: p.author.name, what: `your ${p.kind || "post"} in the community feed` };
  }
  const c = await db.postComment.findUnique({ where: { id }, select: { author: { select: { email: true, name: true } } } });
  if (!c?.author?.email) return null;
  return { email: c.author.email, name: c.author.name, what: "your comment in the community feed" };
}

/** Email the author a statement of reasons. Never throws; returns whether an email went out. */
export async function notifyModeration(input: {
  kind: Kind;
  id: string;
  action: Action;
  reason?: string;
  note?: string;
}): Promise<boolean> {
  try {
    const target = await resolveTarget(input.kind, input.id);
    if (!target) return false; // nothing we can do without an email on file
    const L = legalInfo();
    const reasonText = REASON_LABEL[input.reason ?? "other"] ?? REASON_LABEL.other;
    const note = (input.note ?? "").trim().slice(0, 500);
    const did = actionPhrase(input.kind, input.action);
    const appealUrl = `${SITE.url}/contact`;
    const policyUrl = `${SITE.url}/legal/content-moderation`;

    const bodyHtml =
      `<p>Hi${target.name ? ` ${esc(target.name)}` : ""},</p>` +
      `<p>We've ${esc(did)}: <strong>${esc(target.what)}</strong>.</p>` +
      `<p><strong>Why:</strong> ${esc(reasonText)}.${note ? ` ${esc(note)}` : ""}</p>` +
      `<p>This was decided by a person reviewing the content against our <a href="${esc(SITE.url)}/legal/terms">Terms</a>, not by an automated system. If you think this was a mistake, you can appeal — just reply to this email or use our contact form, and we'll take another look.</p>`;
    const footer = `Questions or appeals: ${esc(L.email)} · <a href="${esc(policyUrl)}" style="color:#7a7488">How moderation and appeals work</a>`;

    const text =
      `Hi${target.name ? ` ${target.name}` : ""},\n\n` +
      `We've ${did}: ${target.what}.\n\n` +
      `Why: ${reasonText}.${note ? ` ${note}` : ""}\n\n` +
      `This was decided by a person reviewing the content against our Terms (${SITE.url}/legal/terms), not by an automated system. ` +
      `If you think this was a mistake, you can appeal — reply to this email or use ${appealUrl}, and we'll take another look.\n\n` +
      `Questions or appeals: ${L.email}\nHow moderation and appeals work: ${policyUrl}\n`;

    return await sendEmail({
      to: target.email,
      subject: `About ${input.kind === "deck" ? "your deck" : "your post"} on ${SITE.name}`,
      html: emailHtml({ heading: "A note about your content", body: bodyHtml, button: { label: "Appeal this", url: appealUrl }, footer }),
      text,
      replyTo: L.email.includes("@") ? L.email : undefined,
    });
  } catch (e) {
    console.error("[moderation] statement-of-reasons email failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
