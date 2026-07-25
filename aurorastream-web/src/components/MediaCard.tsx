import { useState } from "react";
import type { MediaItem } from "@/types/media";
import { displayTitle, posterUrl, ratingText, isRecentlyAdded } from "@/types/media";

interface Props {
  item: MediaItem;
  rank?: number;
  width?: number;
  /** لو true، البطاقة تاخذ عرض عنصرها بالـ CSS grid بدل عرض ثابت بالبكسل (تُستخدم بشاشة البحث). */
  fluid?: boolean;
  onClick: () => void;
}

function rankColor(rank: number): string {
  if (rank === 1) return "bg-rankCrimson";
  if (rank === 2) return "bg-rankGreen";
  return "bg-rankGold";
}

export default function MediaCard({ item, rank, width = 128, fluid = false, onClick }: Props) {
  const [pressed, setPressed] = useState(false);
  const isTopRank = rank === 1;
  const poster = posterUrl(item);

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className={`relative shrink-0 overflow-hidden rounded-lg bg-cardDark text-right transition-transform duration-150 ${
        fluid ? "w-full" : ""
      } ${pressed ? "scale-[0.94]" : "scale-100"} ${
        isTopRank ? "shadow-[0_0_16px_rgba(255,45,120,0.5)] ring-[1.5px] ring-brandRed/60" : "shadow-md ring-1 ring-white/5"
      }`}
      style={fluid ? { aspectRatio: "2 / 3" } : { width, aspectRatio: "2 / 3" }}
    >
      {poster ? (
        <img src={poster} alt={displayTitle(item)} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="h-full w-full bg-cardDark" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

      {/* Rating chip */}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded bg-black/65 px-1.5 py-0.5">
        <StarIcon className="h-2.5 w-2.5 text-goldStar" />
        <span className="text-[11px] font-bold text-white">{ratingText(item)}</span>
      </div>

      {/* Rank badge or NEW badge */}
      {rank ? (
        <div className={`absolute right-0 top-0 rounded-bl-lg rounded-tr-lg px-2 py-0.5 text-xs font-black text-white ${rankColor(rank)}`}>
          {rank}
        </div>
      ) : (
        isRecentlyAdded(item) && (
          <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-rankGreen px-1.5 py-0.5 text-[10px] font-black text-white">
            جديد
          </div>
        )
      )}

      {/* Title */}
      <div className="absolute bottom-1.5 right-2 max-w-[calc(100%-52px)]">
        <p className="truncate text-[12px] font-bold text-white">{displayTitle(item)}</p>
      </div>
    </button>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </svg>
  );
}
