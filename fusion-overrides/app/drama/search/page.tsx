import DramaSearchClient from '@/components/DramaSearchClient';
import type { DramaKind } from '@/lib/drama-client';

export const dynamic = 'force-dynamic';

export default async function DramaSearchPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const params = await searchParams;
  const raw = params.kind || 'series';
  const kind: DramaKind = raw === 'movies' || raw === 'channels' ? raw : 'series';
  return <DramaSearchClient kind={kind} />;
}
