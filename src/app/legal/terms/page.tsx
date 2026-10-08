import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  alternates: { canonical: "/legal/terms" },
  description: `The rules for using ${SITE.name}: accounts, decks, play rooms, the store and proxy orders.`,
};

export default function TermsPage() {
  const L = legalInfo();
  return (
    <LegalPage title="Terms of use">
      <p>
        These terms apply when you use {SITE.name} ({SITE.url}), run by {L.owner}. By using the site
        you agree to them. If you don&apos;t agree, please don&apos;t use the site.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You need to be at least 16 years old to create an account.</li>
        <li>Keep your password to yourself. You&apos;re responsible for what happens under your account.</li>
        <li>You can ask us to delete your account at any time by writing to {L.email}.</li>
      </ul>

      <h2>Decks, names and anything you post</h2>
      <ul>
        <li>You keep ownership of the decks and text you create. By making a deck public you let us show it on the site.</li>
        <li>Don&apos;t post anything illegal, hateful, harassing, sexual, or that you don&apos;t have the rights to (including uploaded card art).</li>
        <li>We can hide or remove content and suspend accounts that break these rules. You can report a public deck with the Report button.</li>
      </ul>

      <h2>Play rooms</h2>
      <p>
        Online play rooms are temporary and are cleared after a few hours without activity. Be fair to
        the people you play with; don&apos;t try to break, flood or take over a room.
      </p>

      <h2>Store and proxy orders</h2>
      <ul>
        <li>Prices are shown in US dollars. Payment is handled by Stripe; we never see your full card number.</li>
        <li>An order is confirmed once payment succeeds. If we can&apos;t fulfil it, we refund you in full.</li>
        <li>
          Proxies are printed placeholder cards for casual play and play-testing only. They are not
          official Magic cards, may not be sold as genuine cards and are not tournament-legal.
        </li>
        <li>
          If you upload your own art, you confirm you made it or have permission to use it. We can
          refuse or cancel orders that infringe someone&apos;s rights (see{" "}
          <Link href="/legal/copyright">Copyright &amp; takedown</Link>).
        </li>
        <li>
          If you&apos;re a consumer in the EU or UK you may have a 14-day right to withdraw from a
          purchase. This doesn&apos;t apply to custom items made to your specification, such as proxy
          orders, once printing has started.
        </li>
      </ul>

      <h2>Premium</h2>
      <ul>
        <li>Premium is a monthly subscription at the price shown on the <Link href="/premium">Premium page</Link>. It renews automatically each month until you cancel.</li>
        <li>
          You can cancel any time with the <Link href="/cancel">Cancel subscription</Link> button
          (also in the footer). Cancelling stops the next renewal; you keep Premium until the end of
          the month you&apos;ve already paid for, then your account goes back to free. Your decks stay.
        </li>
        <li>
          EU and UK consumers normally have 14 days to withdraw from an online purchase. Because
          Premium starts straight away at your request, that right ends once Premium begins — you
          confirm this when you subscribe.
        </li>
        <li>We may change the price for future months; we&apos;ll tell you in advance, and you can cancel before it applies.</li>
      </ul>

      <h2>Fair use of the site</h2>
      <p>
        Don&apos;t scrape the site at scale, attack it, get around its limits, or use it to send spam.
        We rate-limit requests to keep the site fast for everyone.
      </p>

      <h2>Card data and trademarks</h2>
      <p>
        Card images and data come from Scryfall. Magic: The Gathering and its card names, symbols and
        art are property of Wizards of the Coast. {SITE.name} is unofficial Fan Content and is not
        approved or endorsed by Wizards of the Coast. Card prices are estimates and may be out of date.
      </p>

      <h2>Liability</h2>
      <p>
        The site is provided as it is. We do our best to keep it working and accurate but can&apos;t
        promise it will always be available or error-free. Nothing in these terms limits rights you
        have by law as a consumer, or our liability where the law doesn&apos;t allow it to be limited.
      </p>

      <h2>Changes and law</h2>
      <p>
        We may update these terms; the date at the top shows the latest version. The law of {L.country}{" "}
        applies, without taking away protection your own country&apos;s consumer law gives you.
        Questions: {L.email}.
      </p>
    </LegalPage>
  );
}
