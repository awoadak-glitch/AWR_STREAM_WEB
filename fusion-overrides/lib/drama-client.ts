export type DramaKind = 'series' | 'movies' | 'channels';
export type DramaItem = Record<string, any>;

export async function dramaFetch(action: string, params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams({ action });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).length) search.set(key, String(value));
  });
  const response = await fetch(`/api/drama?${search.toString()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || `Drama API ${response.status}`);
  return payload?.data ?? payload;
}

export function isRecord(value: any): value is DramaItem {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asList(payload: any): DramaItem[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];
  const keys = ['data','results','items','posters','movies','series','channels','seasons','episodes','sources','list'];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord);
    if (isRecord(value)) {
      const nested = asList(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function str(value: any) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

export function itemId(item: DramaItem) {
  return str(item.id ?? item.poster_id ?? item.movie_id ?? item.serie_id ?? item.series_id ?? item.channel_id ?? item.episode_id);
}

export function itemTitle(item: DramaItem) {
  return str(item.title ?? item.name ?? item.label ?? item.original_title ?? item.original_name) || 'بدون عنوان';
}

export function itemImage(item: DramaItem) {
  const value = str(item.image ?? item.poster ?? item.poster_url ?? item.poster_path ?? item.cover ?? item.cover_url ?? item.thumbnail ?? item.thumb ?? item.logo);
  if (!value) return '';
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

export function itemBackdrop(item: DramaItem) {
  const value = str(item.backdrop ?? item.backdrop_url ?? item.backdrop_path ?? item.cover ?? item.image ?? item.poster);
  if (!value) return itemImage(item);
  if (value.startsWith('//')) return `https:${value}`;
  return value;
}

export function itemYear(item: DramaItem) {
  const value = str(item.year ?? item.release_date ?? item.first_air_date ?? item.date ?? item.created_at);
  return value.match(/(?:19|20)\d{2}/)?.[0] || '';
}

export function itemType(item: DramaItem): 'series'|'movies'|'channels'|'unknown' {
  const raw = str(item.type ?? item.poster_type ?? item.media_type ?? item.kind ?? item.category).toLowerCase();
  if (/channel|live|قناة/.test(raw) || item.channel_id || item.stream_url) return 'channels';
  if (/serie|series|show|مسلسل/.test(raw) || item.seasons || item.season_count || item.episodes) return 'series';
  if (/movie|film|فيلم/.test(raw)) return 'movies';
  return 'unknown';
}

export function itemDescription(item: DramaItem) {
  return str(item.description ?? item.overview ?? item.story ?? item.synopsis ?? item.content);
}

export function itemSubtitle(item: DramaItem) {
  return str(item.subtitle ?? item.sub_title ?? item.category_name ?? item.country_name ?? item.genre_name);
}

export function itemRating(item: DramaItem) {
  const value = Number.parseFloat(str(item.rating ?? item.rate ?? item.vote_average ?? item.imdb));
  if (!Number.isFinite(value)) return '';
  return (value > 10 ? value / 10 : value).toFixed(1);
}

export function sourceUrl(source: DramaItem) {
  const value = str(source.url ?? source.link ?? source.file ?? source.src ?? source.source ?? source.stream ?? source.play_url ?? source.download_url);
  return value.startsWith('//') ? `https:${value}` : value.replace(/\\\//g, '/');
}

export function sourceLabel(source: DramaItem, index: number) {
  return str(source.title ?? source.name ?? source.label ?? source.server ?? source.host) || `سيرفر ${index + 1}`;
}

export function episodesOf(season: DramaItem) {
  const value = season.episodes ?? season.episode ?? season.items ?? season.data;
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function actionForKind(kind: DramaKind) { return kind; }
export function kindLabel(kind: DramaKind) { return kind === 'series' ? 'المسلسلات' : kind === 'movies' ? 'الأفلام' : 'القنوات'; }
export function detailHref(kind: DramaKind, item: DramaItem) { return `/drama/${kind}/${encodeURIComponent(itemId(item))}`; }
