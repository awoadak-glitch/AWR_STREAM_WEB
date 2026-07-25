import { useEffect, useState } from "react";
import type { MediaItem } from "@/types/media";
import { displayTitle, backdropUrl, itemYear, ratingText } from "@/types/media";
import { PlayIcon, StarIcon } from "./Icons";

interface Props {
  items: MediaItem[];
  onPlay: (item: MediaItem) => void;
}

export default function HeroCarousel({ items, onPlay }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 6000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;
  const item = items[index % items.length];
  const bg = backdropUrl(item);

  return (
    <div className="relative h-[420px] w-full overflow-hidden sm:h-[460px]">
      {bg && (
        <img
          key={item.id}
          src={bg}
          alt={displayTitle(item)}
          className="h-full w-full animate-fade-in object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-deepBlack" style={{ backgroundImage: "linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(0,0,0,0.55) 70%, #09090C 100%)" }} />

      <div className="absolute bottom-0 right-0 w-full max-w-xl p-5">
        <h1 className="mb-2.5 text-2xl font-black leading-tight text-white sm:text-3xl">{displayTitle(item)}</h1>

        <div className="mb-3 flex items-center gap-2">
          {itemYear(item) && (
            <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/90">{itemYear(item)}</span>
          )}
          <span className="rounded-md bg-imdbGold px-1.5 py-0.5 text-[10px] font-black text-black">IMDb</span>
          <span className="flex items-center gap-1 text-[13px] font-bold text-white">
            {ratingText(item)} <StarIcon className="h-3.5 w-3.5 text-goldStar" />
          </span>
        </div>

        <p className="mb-4 line-clamp-3 text-[13px] text-white/75">
          {item.overview || "محتوى حصري مضاف وجاهز للمشاهدة الفورية."}
        </p>

        <button
          onClick={() => onPlay(item)}
          className="flex items-center gap-2 rounded-full bg-brandRed px-6 py-3 font-bold text-white transition hover:brightness-110 active:scale-95"
        >
          <PlayIcon className="h-4 w-4" />
          مشاهدة الآن
        </button>

        {items.length > 1 && (
          <div className="mt-4 flex gap-1.5">
            {items.slice(0, 6).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === index % items.length ? "w-4 bg-brandRed" : "w-1.5 bg-white/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
