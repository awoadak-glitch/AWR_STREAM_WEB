import { NextResponse } from 'next/server';
import { getAnime, getAnimeExtras } from '@/lib/content';

// The same public character records already rendered by the anime detail page.
// Keep them separate so the synopsis and episode list do not wait for portraits.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 300 || /[\x00-\x1f\x7f/\\]/.test(id) || ['.', '..'].includes(id)) {
    return NextResponse.json({ error: 'معرّف الأنمي غير صالح.' }, { status: 400 });
  }
  try {
    const anime = await getAnime(id);
    if (!anime) return NextResponse.json({ error: 'الأنمي غير متاح.' }, { status: 404 });
    const { characters, related } = await getAnimeExtras(id, anime);
    return NextResponse.json({ characters, related }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'تعذر تحميل تفاصيل الأنمي الإضافية. أعد المحاولة.' }, { status: 502 });
  }
}
