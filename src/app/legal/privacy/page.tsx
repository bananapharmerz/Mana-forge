import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

// Rendered on each request so the owner details come from the server settings (LEGAL_* env).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy policy",
  alternates: { canonical: "/legal/privacy" },
  description: `What ${SITE.name} stores about you, why, for how long, and your rights.`,
};

export default function PrivacyPage() {
  const L = legalInfo();
  return (
    <LegalPage title="Privacy policy">
      <p>
        This policy explains what {SITE.name} collects and why. The site is run by {L.owner},{" "}
        {L.address}, who is responsible for your data (the &ldquo;controller&rdquo;). Contact:{" "}
        {L.email}.
      </p>

      <h2>What we store and why</h2>
      <ul>
        <li>
          <b>Account:</b> your email, an optional display name and a scrambled (hashed) version of your
          password. Needed to run your account (contract).
        </li>
        <li>
          <b>Decks, favourites and price watchlist:</b> what you save on the site. Needed to provide
          those features (contract). Public decks show your display name only, never your email.
        </li>
        <li>
          <b>Orders:</b> your email, what you bought, the amount, and for proxy orders your shipping
          name and address. Needed to deliver the order (contract) and kept for tax and accounting
          (legal obligation).
        </li>
        <li>
          <b>Security logs:</b> your IP address is used briefly in memory to limit login attempts and
          abuse, and errors are logged without personal details. Legitimate interest in keeping the
          site safe.
        </li>
        <li>
          <b>Reports:</b> if you report a deck, we store the reason you give and the deck it&apos;s about.
        </li>
        <li>
          <b>Contact form:</b> if you write to us, we store your email, your name if you give it, and your
          message, only so we can answer you (Art. 6(1)(b) and (f) GDPR).
        </li>
      </ul>

      <h2>Cookies and browser storage</h2>
      <p>
        We only use what the site needs to work: a sign-in cookie (secure, HttpOnly, lasts up to 14
        days) and your browser&apos;s own storage for your cart, proxy project, intro animation and
        your seat in a play room. There are no advertising or tracking cookies and no analytics, so
        there&apos;s no cookie banner.
      </p>

      <h2>Who else sees data</h2>
      <ul>
        <li><b>Stripe</b> processes payments. Card details go straight to Stripe and never touch our server.</li>
        <li><b>Scryfall</b> serves card images, so your browser connects to their servers when you view cards.</li>
        <li><b>Our hosting provider</b> runs the server and stores the database.</li>
        <li><b>Resend</b> delivers the emails we send (password resets, the welcome email, replies to contact messages), so it receives your email address and that email.</li>
        <li>Print and shipping partners receive your shipping address for proxy orders.</li>
      </ul>
      <p>We don&apos;t sell your data. Some of these providers may process data outside your country under standard legal safeguards.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account, decks and favourites: until you delete your account.</li>
        <li>Orders: as long as tax law requires (usually up to 10 years), then deleted.</li>
        <li>Play rooms: deleted after a few hours of inactivity.</li>
        <li>Contact messages: deleted within 12 months of our last reply.</li>
        <li>Backups: kept for 14 days.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct, export or delete your data, or object to how it&apos;s used, by
        emailing {L.email}. We reply within one month. You can also complain to your local data
        protection authority.
      </p>

      <h2>Children</h2>
      <p>The site isn&apos;t meant for children under 16 and we don&apos;t knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top changes too. Big changes will be announced on the site.</p>
    </LegalPage>
  );
}
