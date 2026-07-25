import type { MediaItem } from "@/types/media";
import MediaCard from "./MediaCard";
import { CATEGORY_ICONS } from "./Icons";

const ACCENT_COLORS = ["#2ED8C3", "#8B5CF6", "#FF2D78", "#FFC93C", "#3B9EFF"];

function accentFor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
}

interface Props {
  title: string;
  items: MediaItem[];
  showRank?: boolean;
  iconKey?: string;
  onItemClick: (item: MediaItem) => void;
}

export default function CategoryRow({ title, items, showRank, iconKey, onItemClick }: Props) {
  if (items.length === 0) return null;
  const accent = accentFor(title);
  const Icon = CATEGORY_ICONS[iconKey ?? "sparkles"] ?? CATEGORY_ICONS.sparkles;

  return (
    <section className="w-full">
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <div
          className="flex h-[26px] w-[26px] items-center justify-center rounded-lg"
          style={{ background: `linear-gradient(135deg, ${accent}59, ${accent}1f)` }}
        >
          <Icon className="h-[15px] w-[15px]" style={{ color: accent }} />
        </div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => (
          <MediaCard key={`${item.category}_${item.id}`} item={item} rank={showRank ? index + 1 : undefined} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </section>
  );
}
