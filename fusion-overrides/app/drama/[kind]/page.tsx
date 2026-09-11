import { notFound } from 'next/navigation';
import DramaHubClient from '@/components/DramaHubClient';
import type { DramaKind } from '@/lib/drama-client';

export const dynamic = 'force-dynamic';

export default async function DramaHubPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!['series','movies','channels'].includes(kind)) notFound();
  return <DramaHubClient kind={kind as DramaKind} />;
}
