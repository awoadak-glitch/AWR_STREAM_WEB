export type DramaSection = "series" | "movies" | "channels";
export type DramaRecord = Record<string, unknown>;

const DRAMA_API = "https://dramaworld-awoadak-glitchs-projects.vercel.app/api/drama";

function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
}

export async function dramaRequest(action: string, params: Record<string, string | number | undefined> = {}): Promise<unknown> {
  const url = new URL(DRAMA_API);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json, text/plain, */*" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Drama API ${response.status}`);
  return response.json();
}

export function recordsFrom(payload: unknown): DramaRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord) as DramaRecord[];
  if (!isRecord(payload)) return [];

  const preferred = ["data", "results", "items", "posters", "movies", "series", "channels", "seasons", "episodes", "sources"];
  for (const key of preferred) {
    const value = payload[key];
    if (Array.isArray(value)) return value.filter(isRecord) as DramaRecord[];
    if (isRecord(value)) {
      const nested = recordsFrom(value);
      if (nested.length) return nested;
    }
  }

  return [];
}

export function isRecord(value: unknown): value is DramaRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function dramaId(item: DramaRecord): string {
  return text(item.id ?? item.poster_id ?? item.movie_id ?? item.serie_id ?? item.channel_id ?? item.episode_id);
}

export function dramaTitle(item: DramaRecord): string {
  return text(item.title ?? item.name ?? item.label ?? item.original_title ?? item.original_name) || "بدون عنوان";
}

export function dramaSubtitle(item: DramaRecord): string {
  return text(item.subtitle ?? item.sub_title ?? item.category_name ?? item.country_name ?? item.genre_name);
}

export function dramaDescription(item: DramaRecord): string {
  return text(item.description ?? item.overview ?? item.story ?? item.synopsis ?? item.content);
}

export function dramaYear(item: DramaRecord): string {
  const raw = text(item.year ?? item.release_date ?? item.date ?? item.created_at);
  const match = raw.match(/(?:19|20)\d{2}/);
  return match?.[0] ?? "";
}

export function dramaRating(item: DramaRecord): string {
  const raw = item.rating ?? item.rate ?? item.vote_average ?? item.imdb;
  const value = Number.parseFloat(text(raw));
  if (!Number.isFinite(value)) return "";
  return value > 10 ? (value / 10).toFixed(1) : value.toFixed(1);
}

export function dramaImage(item: DramaRecord): string {
  const value = text(
    item.image ?? item.poster ?? item.poster_url ?? item.poster_path ?? item.cover ?? item.cover_url ?? item.logo ?? item.thumbnail ?? item.thumb
  );
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

export function dramaBackdrop(item: DramaRecord): string {
  const value = text(item.backdrop ?? item.backdrop_url ?? item.backdrop_path ?? item.cover ?? item.image ?? item.poster);
  if (!value) return dramaImage(item);
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

export function dramaType(item: DramaRecord): "movie" | "series" | "channel" | "unknown" {
  const raw = text(item.type ?? item.poster_type ?? item.kind ?? item.media_type ?? item.category).toLowerCase();
  if (/channel|tv|live|قناة/.test(raw)) return "channel";
  if (/serie|series|show|مسلسل/.test(raw)) return "series";
  if (/movie|film|فيلم/.test(raw)) return "movie";

  if (item.seasons || item.season_count || item.episodes) return "series";
  if (item.channel_id || item.stream_url) return "channel";
  return "unknown";
}

export function sourceUrl(item: DramaRecord): string {
  const value = text(item.url ?? item.link ?? item.file ?? item.src ?? item.source ?? item.stream ?? item.play_url ?? item.download_url);
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  return value.replace(/\\\//g, "/");
}

export function sourceName(item: DramaRecord, index: number): string {
  return text(item.name ?? item.title ?? item.label ?? item.server ?? item.host) || `سيرفر ${index + 1}`;
}

export function episodesFromSeason(season: DramaRecord): DramaRecord[] {
  const direct = season.episodes ?? season.episode ?? season.items ?? season.data;
  return Array.isArray(direct) ? (direct.filter(isRecord) as DramaRecord[]) : [];
}

export async function loadDramaSection(section: DramaSection, page = 0): Promise<DramaRecord[]> {
  const payload = await dramaRequest(section, section === "channels" ? { page, category: 0, country: 0 } : { page, genre: 0, order: "created" });
  return recordsFrom(payload);
}

export async function searchDrama(query: string): Promise<DramaRecord[]> {
  const payload = await dramaRequest("search", { query, page: 0 });
  return recordsFrom(payload);
}

export async function loadDramaDetails(item: DramaRecord, section: DramaSection): Promise<DramaRecord> {
  const id = dramaId(item);
  if (!id) return item;
  const payload = await dramaRequest(section === "channels" ? "channel" : "poster", { id });
  if (isRecord(payload)) {
    const nested = isRecord(payload.data) ? payload.data : payload;
    return { ...item, ...nested };
  }
  const list = recordsFrom(payload);
  return list[0] ? { ...item, ...list[0] } : item;
}

export async function loadSeasons(item: DramaRecord): Promise<DramaRecord[]> {
  const id = dramaId(item);
  if (!id) return [];
  return recordsFrom(await dramaRequest("seasons", { id }));
}

export async function loadMovieSources(item: DramaRecord): Promise<DramaRecord[]> {
  const id = dramaId(item);
  if (!id) return [];
  return recordsFrom(await dramaRequest("movie-sources", { id }));
}

export async function loadEpisodeSources(item: DramaRecord): Promise<DramaRecord[]> {
  const id = dramaId(item);
  if (!id) return [];
  return recordsFrom(await dramaRequest("episode-sources", { id }));
}

export async function inspectDramaSource(url: string): Promise<string[]> {
  if (!url) return [];
  try {
    const payload = await dramaRequest("inspect-source", { url });
    if (!isRecord(payload)) return [];
    const candidates = payload.urls ?? payload.sources ?? payload.data;
    if (!Array.isArray(candidates)) return [];
    return candidates.map(text).filter(Boolean);
  } catch {
    return [];
  }
}
