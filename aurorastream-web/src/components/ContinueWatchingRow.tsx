import type { WatchHistoryEntry } from "@/types/watchHistory";
import { resumeLabel } from "@/types/watchHistory";
import { displayTitle, backdropUrl, posterUrl } from "@/types/media";
import { PlayIcon, CloseIcon } from "./Icons";

interface Props {
  entries: WatchHistoryEntry[];
  onResume: (entry: WatchHistoryEntry) => void;
  onRemove: (itemId: number) => void;
}

export default function ContinueWatchingRow({ entries, onResume, onRemove }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="w-full">
      <h2 className="px-4 py-2.5 text-lg font-bold text-white">متابعة المشاهدة</h2>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((entry) => {
          const bg = backdropUrl(entry.item) ?? posterUrl(entry.item);
          return (
            <div key={entry.item.id} className="relative shrink-0" style={{ width: 220 }}>
              <button
                onClick={() => onResume(entry)}
                className="relative block h-[124px] w-[220px] overflow-hidden rounded-[10px] text-right"
              >
                {bg && <img src={bg} alt={displayTitle(entry.item)} className="h-full w-full object-cover" loading="lazy" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/45 p-2.5">
                    <PlayIcon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 max-w-[90%]">
                  <p className="truncate text-[12px] font-bold text-white">{displayTitle(entry.item)}</p>
                  <p className="text-[10px] font-semibold text-brandRed">{resumeLabel(entry)}</p>
                </div>
              </button>
              <button
                onClick={() => onRemove(entry.item.id)}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1.5"
                aria-label="إزالة"
              >
                <CloseIcon className="h-2.5 w-2.5 text-white" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
