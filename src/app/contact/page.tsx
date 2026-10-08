import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { legalInfo } from "@/lib/legal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions, bugs, account or Premium help: send the Mana Forge team a message.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact us · Mana Forge", description: "Questions, bugs, account or Premium help: send the Mana Forge team a message." },
};

export default function ContactPage() {
  const L = legalInfo();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Contact us</h1>
      <p className="mt-2 text-sm text-muted">
        Questions, a bug, help with your account or Premium? Send us a message and we&apos;ll reply by
        email, usually within two days. You can also write to{" "}
        <a href={`mailto:${L.email}`} className="text-gold-bright underline">{L.email}</a>.
      </p>
      <ContactForm />
    </div>
  );
}
