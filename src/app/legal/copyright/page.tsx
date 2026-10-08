import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Copyright & takedown",
  alternates: { canonical: "/legal/copyright" },
  description: `How to report content on ${SITE.name} that infringes your copyright or trademark.`,
};

export default function CopyrightPage() {
  const L = legalInfo();
  return (
    <LegalPage title="Copyright & takedown">
      <p>
        We respect artists&apos; and creators&apos; rights. Magic: The Gathering card names, symbols and
        official art belong to Wizards of the Coast and the individual artists. {SITE.name} is
        unofficial Fan Content and doesn&apos;t claim any of it.
      </p>

      <h2>Uploading your own art</h2>
      <p>
        When you upload art for a card back or a proxy, you confirm that you made it yourself or have
        the rights holder&apos;s permission. Don&apos;t upload other people&apos;s artwork, logos or scans
        of official cards. We may refuse or cancel orders, and remove uploads, that we believe
        infringe someone&apos;s rights.
      </p>

      <h2>Reporting infringement</h2>
      <p>If you believe something on the site infringes your rights, email {L.email} with:</p>
      <ul>
        <li>your name and how to contact you;</li>
        <li>what work you own, and the link to where it appears on {SITE.name};</li>
        <li>a statement that you believe in good faith the use isn&apos;t authorised;</li>
        <li>a statement that your notice is accurate and that you are the owner or allowed to act for them;</li>
        <li>your physical or electronic signature.</li>
      </ul>
      <p>
        We&apos;ll review it promptly and remove or disable the content where appropriate. If your
        content was removed and you think that was a mistake, reply with your reasons and we&apos;ll
        take another look. Accounts that repeatedly infringe will be closed.
      </p>
    </LegalPage>
  );
}
