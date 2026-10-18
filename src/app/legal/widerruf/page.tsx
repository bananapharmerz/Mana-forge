import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

// The formal withdrawal instruction (Widerrufsbelehrung) + model withdrawal form that EU/German
// distance-selling law requires us to provide. Rendered per request so the owner details come from
// the server settings (LEGAL_* env).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Right of withdrawal",
  alternates: { canonical: "/legal/widerruf" },
  description: `Your 14-day right to withdraw from a Premium subscription or an order on ${SITE.name}, how to use it, and the model withdrawal form.`,
};

export default function WiderrufPage() {
  const L = legalInfo();
  // Pre-filled withdrawal email, so one tap opens a ready-to-send declaration.
  const formText = `To: ${L.owner}, ${L.address} (${L.email})

I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract for
the following:

- Service / order: Premium subscription (*) / store or proxy order (*)
- Ordered on (*) / received on (*): ____________________
- Account email (for Premium): ____________________
- Name of consumer(s): ____________________
- Address of consumer(s): ____________________
- Date: ____________________
- Signature (only if sent on paper): ____________________

(*) Delete as appropriate.`;
  const mailto = `mailto:${L.email}?subject=${encodeURIComponent("Withdrawal from contract (Widerruf)")}&body=${encodeURIComponent(formText)}`;

  return (
    <LegalPage title="Right of withdrawal">
      <p>
        If you&apos;re a consumer in the EU or UK, you have a 14-day right to withdraw from a distance
        contract with {SITE.name} ({SITE.url}), run by {L.owner}. This page is the formal withdrawal
        instruction and includes a model withdrawal form you can use.
      </p>

      <h2>Right of withdrawal</h2>
      <p>You have the right to withdraw from this contract within 14 days without giving any reason.</p>
      <ul>
        <li>
          For <strong>Premium</strong> (a digital service), the period is 14 days from the day the
          contract is concluded — i.e. when your subscription starts.
        </li>
        <li>
          For <strong>store or proxy orders</strong> (goods), the period is 14 days from the day you,
          or someone you name, take physical possession of the goods.
        </li>
      </ul>

      <h2>How to withdraw</h2>
      <p>
        To exercise it, you must inform us — {L.owner}, {L.address}, {L.email} — of your decision by a
        clear statement (for example, a letter sent by post or an email). You may use the model form
        below, but you don&apos;t have to. To meet the deadline, it&apos;s enough to send your message
        before the 14-day period ends.
      </p>
      <p>
        <a href={mailto}>Email your withdrawal</a> (opens a pre-filled message), or, if you&apos;re
        signed in and want to stop Premium right away, use the{" "}
        <Link href="/cancel">Cancel / withdraw subscription</Link> button.
      </p>

      <h2>Effects of withdrawal</h2>
      <p>
        If you withdraw, we refund all payments we received from you without undue delay and within 14
        days of being informed, using the same means of payment you used, at no cost to you.
      </p>

      <h2>When the right ends early</h2>
      <ul>
        <li>
          <strong>Premium:</strong> if you ask us to start Premium during the withdrawal period and
          confirm that you understand you lose the right of withdrawal once it begins — which you tick
          at checkout — the right ends when the service starts. You can still stop future billing at
          any time with <Link href="/cancel">Cancel subscription</Link>.
        </li>
        <li>
          <strong>Custom proxies:</strong> the right doesn&apos;t apply to goods made to your
          specification (such as proxy orders with your own art or list) once production has started.
        </li>
      </ul>

      <h2>Model withdrawal form</h2>
      <p>(Complete and return this form only if you wish to withdraw from the contract.)</p>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-xs text-foreground">
        {formText}
      </pre>

      <p>
        Questions about any of this: {L.email}. See also our <Link href="/legal/terms">Terms</Link>.
      </p>
    </LegalPage>
  );
}
