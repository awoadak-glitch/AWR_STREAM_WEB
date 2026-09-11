import { notFound } from 'next/navigation';
import DramaDetailClient from '@/components/DramaDetailClient';
import type { DramaKind } from '@/lib/drama-client';

export const dynamic = 'force-dynamic';

export default async function DramaDetailPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!['series','movies','channels'].includes(kind) || !id) notFound();
  return <DramaDetailClient kind={kind as DramaKind} id={decodeURIComponent(id)} />;
}
