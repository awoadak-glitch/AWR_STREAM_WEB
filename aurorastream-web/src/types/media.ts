export interface CastMember {
  name: string;
  role: string;
  photo_url?: string | null;
}

export interface SeasonInfo {
  season_number: number;
  episode_count: number;
  vote_average?: number | null;
  air_date?: string | null;
  cast?: CastMember[] | null;
}

export interface MediaItem {
  id: number;
  title?: string | null;
  name?: string | null;
  title_en?: string | null;
  overview?: string | null;
  overview_en?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
  release_date?: string | null;
  first_air_date?: string | null;
  media_type?: string | null;
  original_title?: string | null;
  original_name?: string | null;
  seasons?: SeasonInfo[] | null;
  cast?: CastMember[] | null;
  date_added?: number | null;
  manual_seasons_override?: boolean;
  /** Injected client-side from the filename this item came from — not part of the source JSON. */
  category?: string;
}

export const IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500";
export const IMG_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original";

export function displayTitle(item: MediaItem): string {
  return item.title ?? item.name ?? "بدون عنوان";
}

export function itemYear(item: MediaItem): string {
  const raw = item.release_date ?? item.first_air_date ?? "";
  return raw.slice(0, 4);
}

export function resolvedType(item: MediaItem): "movie" | "tv" {
  if (item.media_type) return item.media_type as "movie" | "tv";
  if (item.category) return item.category === "movies" ? "movie" : "tv";
  return item.title ? "movie" : "tv";
}

export function ratingText(item: MediaItem): string {
  return item.vote_average != null ? item.vote_average.toFixed(1) : "0.0";
}

export function validSeasons(item: MediaItem): SeasonInfo[] {
  return (item.seasons ?? []).filter((s) => s.season_number > 0 && s.episode_count > 0);
}

export function castList(item: MediaItem): CastMember[] {
  return (item.cast ?? []).filter((c) => c.name.trim().length > 0);
}

export function isRecentlyAdded(item: MediaItem): boolean {
  if (!item.date_added) return false;
  return Date.now() - item.date_added < 48 * 60 * 60 * 1000;
}

export function posterUrl(item: MediaItem): string | undefined {
  return item.poster_path ? `${IMG_BASE_W500}${item.poster_path}` : undefined;
}

export function backdropUrl(item: MediaItem): string | undefined {
  const path = item.backdrop_path ?? item.poster_path;
  return path ? `${IMG_BASE_ORIGINAL}${path}` : undefined;
}

export function seasonRatingText(season: SeasonInfo | undefined, fallback: MediaItem): string {
  if (season?.vote_average) return season.vote_average.toFixed(1);
  return ratingText(fallback);
}

export function seasonYear(season: SeasonInfo | undefined, fallback: MediaItem): string {
  if (season?.air_date && season.air_date.length >= 4) return season.air_date.slice(0, 4);
  return itemYear(fallback);
}

export function seasonCastList(season: SeasonInfo | undefined, fallback: MediaItem): CastMember[] {
  const seasonCast = (season?.cast ?? []).filter((c) => c.name.trim().length > 0);
  if (seasonCast.length > 0) return seasonCast;
  return castList(fallback);
}

export type LibraryCategoryKey = "trending" | "latest" | "movies" | "series" | "kdrama" | "anime";

export interface LibraryCategoryDef {
  key: LibraryCategoryKey;
  displayNameAr: string;
  icon: string;
}

export const LIBRARY_CATEGORIES: LibraryCategoryDef[] = [
  { key: "trending", displayNameAr: "الأكثر رواجاً", icon: "flame" },
  { key: "latest", displayNameAr: "الأحدث على الإنترنت", icon: "sparkles" },
  { key: "movies", displayNameAr: "أفلام", icon: "film" },
  { key: "series", displayNameAr: "مسلسلات", icon: "tv" },
  { key: "kdrama", displayNameAr: "دراما كورية", icon: "masks" },
  { key: "anime", displayNameAr: "أنمي", icon: "wand" },
];
