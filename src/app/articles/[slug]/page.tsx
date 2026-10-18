import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleBody from "@/components/ArticleBody";
import { ARTICLES, ARTICLE_SLUGS, getArticle } from "@/lib/articles";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return ARTICLE_SLUGS.map((slug) => ({ slug }));
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return { title: "Article not found", robots: { index: false } };
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.description, url: `/articles/${a.slug}`, publishedTime: a.date, images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title: a.title, description: a.description, images: ["/twitter-image"] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  const others = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    datePublished: a.date,
    dateModified: a.updated ?? a.date,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
    mainEntityOfPage: `${SITE.url}/articles/${a.slug}`,
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Link href="/articles" className="text-xs text-muted underline hover:text-gold-bright">
        ← Articles
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold-bright">{a.category}</span>
        <span>{fmtDate(a.date)}</span>
        <span>· {a.readMins} min read</span>
      </div>
      <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{a.title}</h1>
      <p className="mt-2 text-base text-muted">{a.description}</p>
      <hr className="my-6 border-border" />
      <ArticleBody body={a.body} />
      <hr className="my-8 border-border" />
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">More from {SITE.name}</h2>
        <div className="mt-3 flex flex-col gap-2">
          {others.map((o) => (
            <Link key={o.slug} href={`/articles/${o.slug}`} className="text-sm text-gold-bright underline hover:text-gold">
              {o.title}
            </Link>
          ))}
        </div>
        <Link
          href="/deck-builder"
          className="mt-6 inline-flex rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-black hover:bg-gold-bright"
        >
          Start building a deck →
        </Link>
      </div>
    </div>
  );
}
