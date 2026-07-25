import type { MediaItem, SeasonInfo } from "./media";
import { validSeasons } from "./media";

export interface WatchHistoryEntry {
  item: MediaItem;
  season?: number | null;
  episode?: number | null;
  lastWatchedAt: number;
}

export function resumeLabel(entry: WatchHistoryEntry): string {
  if (entry.season && entry.episode) {
    return `الموسم ${entry.season} • الحلقة ${entry.episode}`;
  }
  return "استكمال المشاهدة";
}

export function nextEpisodeOf(entry: WatchHistoryEntry): { season: number; episode: number } | null {
  if (!entry.season || !entry.episode) return null;
  const seasons = validSeasons(entry.item);
  const current = seasons.find((s: SeasonInfo) => s.season_number === entry.season);
  if (!current) return null;

  if (entry.episode < current.episode_count) {
    return { season: entry.season, episode: entry.episode + 1 };
  }
  const nextSeason = seasons.find((s: SeasonInfo) => s.season_number === (entry.season as number) + 1);
  if (nextSeason) return { season: nextSeason.season_number, episode: 1 };
  return null;
}
