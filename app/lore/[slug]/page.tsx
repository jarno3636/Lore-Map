import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLoreFragment } from '@/lib/lore';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fragment = getLoreFragment(slug);

  if (!fragment) return {};

  return {
    title: `${fragment.title} — Tobyworld`,
    description: fragment.description,
    openGraph: {
      title: `${fragment.title} — Tobyworld`,
      description: fragment.quote,
      images: [`/lore/${fragment.slug}/opengraph-image`],
    },
  };
}

export default async function LorePage({ params }: PageProps) {
  const { slug } = await params;
  const fragment = getLoreFragment(slug);

  if (!fragment) notFound();

  return (
    <main className={`share-page share-${fragment.accent}`}>
      <div className="share-page-orb share-page-orb-a" />
      <div className="share-page-orb share-page-orb-b" />
      <section className="share-page-card">
        <p className="eyebrow">TOBYWORLD · LORE FRAGMENT</p>
        <p className="rune-label">{fragment.rune}</p>
        <h1>{fragment.title}</h1>
        <blockquote>{fragment.quote}</blockquote>
        <p className="share-description">{fragment.description}</p>
        <div className="share-page-actions">
          <Link href="/" className="share-link primary-link">
            Enter the Living Flywheel
          </Link>
          <a href={fragment.sourceUrl} target="_blank" rel="noreferrer" className="share-link">
            {fragment.sourceLabel} ↗
          </a>
        </div>
      </section>
    </main>
  );
}
