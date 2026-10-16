import { NextResponse } from 'next/server';
import { getAnime } from '@/lib/content';
import { getDocument, listDocuments } from '@/lib/firestore';
import { safeGetIndexObject, safeSearch } from '@/lib/algolia';
import { normalizeAnime } from '@/lib/normalize';

export const maxDuration = 60;
const PAGE_SIZE = 24;
const image = (v: any): string => typeof v === 'string' ? v : v?.large || v?.medium || v?.url || v?.image_url || v?.jpg?.image_url || '';
const picture = (v: any): string => image(v?.main_picture || v?.picture || v?.image || v?.images || v?.poster);
const characterId = (v: any): string => String(v.character_id || v.character?.id || v.id || '').trim();

// Hydrate only the visible page. Character relations are small, and reading all
// relation pages lets the main cast appear first even when IDs sort after 16.
async function relations(id: string) {
  const items: any[] = [];
  let pageToken: string | undefined;
  do {
    const page = await listDocuments(`anime_list/${encodeURIComponent(id)}/characters`, { pageSize: 300, pageToken });
    items.push(...page.items);
    pageToken = page.nextPageToken;
    if (items.length > 10000) throw new Error('Character catalogue too large');
  } while (pageToken);
  return items.sort((a, b) => Number(/main|رئيس/i.test(b.role || '')) - Number(/main|رئيس/i.test(a.role || '')) || characterId(a).localeCompare(characterId(b), 'en', { numeric: true }));
}

async function hydrate(relation: any) {
  const id = characterId(relation);
  if (!id) return null;
  let record: any = await getDocument(`characters_list/${encodeURIComponent(id)}`).catch(() => null);
  if (!record?.name && !record?.data?.name) record = await safeGetIndexObject('characters', id);
  const value = { ...(record || {}), ...relation }, data = value.data || record?.data || {};
  const voices = value.voices || value.voice_actors || data.voices || [];
  return {
    public: {
      id, name: value.name || data.name || '', main_picture: picture(value) || picture(data),
      role: relation.role || '', likes: value.likes ?? data.favorites ?? null,
      about: value.about || value.description || data.about || '',
      voices: Array.isArray(voices) ? voices.map((v: any) => {
        const person = v.person || v.voice_actor || v;
        return { person: { id: person.id || person.mal_id || '', name: person.name || '', image: picture(person) }, language: v.language || person.language || '' };
      }).filter((v: any) => v.person.name) : [],
    },
    anime: Array.isArray(data.anime) ? data.anime : [],
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = Number(new URL(request.url).searchParams.get('page') || '0');
  if (!id || id.length > 300 || /[\x00-\x1f\x7f/\\]/.test(id) || ['.', '..'].includes(id) || !Number.isInteger(page) || page < 0 || page > 416) {
    return NextResponse.json({ error: 'طلب تفاصيل الأنمي غير صالح.' }, { status: 400 });
  }
  try {
    const [anime, all] = await Promise.all([getAnime(id), relations(id)]);
    if (!anime) return NextResponse.json({ error: 'الأنمي غير متاح.' }, { status: 404 });
    const visible = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), hydrated: any[] = [];
    for (let start = 0; start < visible.length; start += 8) hydrated.push(...await Promise.all(visible.slice(start, start + 8).map(hydrate)));
    const records = hydrated.filter(Boolean);
    // Some source relations use document IDs, others use MyAnimeList IDs.
    // Resolve the latter only when a title and matching MAL ID are available.
    const related = page === 0 ? await Promise.all((Array.isArray((anime as any).related_anime_ids) ? (anime as any).related_anime_ids : []).slice(0, 12).map(async (relation: any) => {
      const docId = typeof relation === 'string' ? relation : relation.id;
      if (docId) return getDocument(`anime_list/${encodeURIComponent(docId)}`).catch(() => null);
      const malId = String(relation.mal_id || '');
      const credit = records.flatMap(v => v.anime).find(v => String(v.anime?.mal_id) === malId)?.anime;
      if (!malId || !credit?.title) return null;
      const found = await safeSearch('series', credit.title, { hitsPerPage: 5 });
      return found.hits.find((hit: any) => String(hit.mal_id || hit.details?.mal_id) === malId) || null;
    })) : [];
    return NextResponse.json({
      characters: records.map(v => v.public), total: all.length, page,
      nextPage: (page + 1) * PAGE_SIZE < all.length ? page + 1 : null,
      related: related.filter(Boolean).map(normalizeAnime),
    }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch {
    return NextResponse.json({ error: 'تعذر تحميل تفاصيل الأنمي الإضافية. أعد المحاولة.' }, { status: 502 });
  }
}
