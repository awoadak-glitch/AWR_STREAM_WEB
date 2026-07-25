import { useState, useMemo } from "react";
import type { MediaItem, SeasonInfo } from "@/types/media";
import {
  displayTitle,
  backdropUrl,
  posterUrl,
  resolvedType,
  validSeasons,
  seasonRatingText,
  seasonYear,
  seasonCastList,
} from "@/types/media";
import { useAppStore } from "@/store/useAppStore";
import CastRow from "@/components/CastRow";
import { PlayIcon, StarIcon, CloseIcon, AlertIcon } from "@/components/Icons";

interface Props {
  item: MediaItem;
  onDismiss: () => void;
  onPlayMovie: (item: MediaItem) => void;
  onPlayEpisode: (item: MediaItem, season: number, episode: number) => void;
}

export default function DetailsView({ item, onDismiss, onPlayMovie, onPlayEpisode }: Props) {
  const lastWatchedPosition = useAppStore((s) => s.lastWatchedPosition);
  const initial = useMemo(() => lastWatchedPosition(item.id), [item.id, lastWatchedPosition]);

  const seasons = validSeasons(item);
  const isTv = resolvedType(item) === "tv" && seasons.length > 0;

  const [season, setSeason] = useState<number>(initial?.season ?? seasons[0]?.season_number ?? 1);
  const selectedSeasonInfo: SeasonInfo | undefined = seasons.find((s) => s.season_number === season);
  const episodeCount = selectedSeasonInfo?.episode_count ?? 1;

  const [episode, setEpisode] = useState<number>(() => {
    const raw = initial?.episode ?? 1;
    return Math.min(Math.max(raw, 1), Math.max(episodeCount, 1));
  });

  const rating = seasonRatingText(selectedSeasonInfo, item);
  const year = seasonYear(selectedSeasonInfo, item);
  const cast = seasonCastList(selectedSeasonInfo, item);

  const bg = backdropUrl(item);
  const poster = posterUrl(item);

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-deepBlack">
      <div className="relative h-[260px] w-full overflow-hidden">
        {bg && <img src={bg} alt={displayTitle(item)} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-deepBlack" />
        <button onClick={onDismiss} className="absolute right-3.5 top-3.5 rounded-full bg-black/50 p-2.5">
          <CloseIcon className="h-4 w-4 text-white" />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-10">
        <div className="-mt-10 flex items-start gap-3.5">
          <div className="h-[150px] w-[100px] shrink-0 overflow-hidden rounded-[10px] bg-cardDark">
            {poster && <img src={poster} alt={displayTitle(item)} className="h-full w-full object-cover" />}
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <h1 className="text-xl font-black text-white">{displayTitle(item)}</h1>
            {item.title_en && item.title_en !== displayTitle(item) && (
              <p className="text-[13px] text-white/50">{item.title_en}</p>
            )}
            <div className="mt-1 flex items-center gap-1.5">
              {year && (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/85">{year}</span>
              )}
              <span className="rounded bg-imdbGold px-1 py-0.5 text-[9px] font-black text-black">IMDb</span>
              <span className="flex items-center gap-1 text-[12px] font-bold text-white">
                {rating} <StarIcon className="h-3 w-3 text-goldStar" />
              </span>
              {isTv && (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/85">الموسم {season}</span>
              )}
            </div>
          </div>
        </div>

        {item.overview && <p className="line-clamp-6 text-[13px] text-white/80">{item.overview}</p>}

        <CastRow cast={cast} />

        {isTv ? (
          <>
            {seasons.length > 1 && (
              <Picker
                label="الموسم"
                items={seasons.map((s) => ({ id: s.season_number, label: `موسم ${s.season_number}` }))}
                selected={season}
                onSelect={(s) => {
                  setSeason(s);
                  setEpisode(1);
                }}
              />
            )}
            {episodeCount > 0 && (
              <Picker
                label="الحلقة"
                items={Array.from({ length: episodeCount }, (_, i) => ({ id: i + 1, label: String(i + 1) }))}
                selected={episode}
                onSelect={setEpisode}
              />
            )}
            <button
              onClick={() => onPlayEpisode(item, season, episode)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brandRed py-3.5 font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              <PlayIcon className="h-4 w-4" />
              مشاهدة الآن
            </button>
          </>
        ) : (
          <button
            onClick={() => onPlayMovie(item)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brandRed py-3.5 font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <PlayIcon className="h-4 w-4" />
            مشاهدة الآن
          </button>
        )}

        <p className="mt-1 flex items-center gap-2 text-[13px] text-white/50">
          <AlertIcon className="h-4 w-4" />
          واجهت مشكلة بهذا العمل؟ تواصل معنا من صفحة الإعدادات
        </p>
      </div>
    </div>
  );
}

function Picker({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: { id: number; label: string }[];
  selected: number;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-white/70">{label}</span>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={`shrink-0 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition ${
              it.id === selected ? "bg-brandRed text-white" : "bg-surfaceElevated text-white/60"
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
