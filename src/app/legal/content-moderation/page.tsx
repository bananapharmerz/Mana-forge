import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

// Our content-moderation and appeals statement (EU Digital Services Act): how public content is
// moderated, what happens when something is restricted, and how to appeal or report illegal content.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Moderation & appeals",
  alternates: { canonical: "/legal/content-moderation" },
  description: `How ${SITE.name} moderates public decks, posts and comments, how you're told when your content is restricted, and how to appeal or report illegal content.`,
};

export default function ContentModerationPage() {
  const L = legalInfo();
  return (
    <LegalPage title="Moderation & appeals">
      <p>
        {SITE.name} lets people share public decks and post in the community feed. We keep that space
        useful and lawful. This page explains how we moderate it and what your options are, in line
        with the EU Digital Services Act.
      </p>

      <h2>What we moderate</h2>
      <p>
        Public content — public decks, feed posts and comments. Private, unshared decks aren&apos;t
        moderated. Our rules for what&apos;s allowed are in the{" "}
        <Link href="/legal/terms">Terms</Link>: nothing illegal, hateful, harassing, sexual, spammy,
        or that you don&apos;t have the rights to.
      </p>

      <h2>Reporting content</h2>
      <p>
        Anyone can report a public deck or post with its <strong>Report</strong> button — signed in or
        not. For anything else, including a notice that content is illegal, email us at {L.email} or
        use the <Link href="/contact">contact form</Link>. For copyright or other intellectual-property
        complaints, see <Link href="/legal/copyright">Copyright &amp; takedown</Link>.
      </p>

      <h2>If we restrict your content</h2>
      <p>
        When we hide, remove or make private a piece of your public content, we email you a short{" "}
        <em>statement of reasons</em>: what we did, why, and that you can appeal. These decisions are
        made by a person reviewing the content against our Terms — we don&apos;t use automated tools to
        remove content.
      </p>

      <h2>How to appeal</h2>
      <p>
        If you think a decision was wrong, reply to that email or use the{" "}
        <Link href="/contact">contact form</Link> within a reasonable time, and we&apos;ll review it
        again and get back to you. You can also take a complaint to an out-of-court dispute-settlement
        body or your local authority where the law provides for it.
      </p>

      <h2>Single point of contact</h2>
      <p>
        For moderation, legal notices and DSA matters, our point of contact is <strong>{L.email}</strong>
        . Communications may be in English or German. The operator is {L.owner}, {L.address}.
      </p>

      <p>
        See also our <Link href="/legal/terms">Terms</Link>,{" "}
        <Link href="/legal/privacy">Privacy policy</Link> and{" "}
        <Link href="/legal/impressum">Legal notice</Link>.
      </p>
    </LegalPage>
  );
}
