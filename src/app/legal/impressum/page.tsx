import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";
import { SITE } from "@/lib/site";

// Rendered on each request so the owner details come from the server settings (LEGAL_* env).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legal notice",
  alternates: { canonical: "/legal/impressum" },
  description: `Who runs ${SITE.name} and how to contact us.`,
};

export default function ImpressumPage() {
  const L = legalInfo();
  return (
    <LegalPage title="Legal notice (Impressum)">
      <p>{SITE.name} is run by:</p>
      <p className="whitespace-pre-line">
        {L.owner}
        {"\n"}
        {L.address}
      </p>
      <p>Email: {L.email}</p>

      <h2>Responsible for content</h2>
      <p>{L.owner}, address as above.</p>

      <h2>Online dispute resolution</h2>
      <p>
        We are not obliged and not willing to take part in dispute resolution proceedings before a
        consumer arbitration board. Please contact us directly by email if something went wrong.
      </p>

      <h2>Fan content</h2>
      <p>
        Portions of {SITE.name} are unofficial Fan Content permitted under the Wizards of the Coast Fan
        Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property
        of Wizards of the Coast. &copy;Wizards of the Coast LLC.
      </p>
    </LegalPage>
  );
}
