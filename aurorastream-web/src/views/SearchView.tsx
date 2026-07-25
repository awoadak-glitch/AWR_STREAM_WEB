import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { MediaItem } from "@/types/media";
import MediaCard from "@/components/MediaCard";
import { SearchIcon } from "@/components/Icons";

interface Props {
  onItemClick: (item: MediaItem) => void;
}

export default function SearchView({ onItemClick }: Props) {
  const { searchPool, searchPoolLoading, prewarmSearch } = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);

  useEffect(() => {
    void prewarmSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    // البحث محلي بالكامل على البيانات المحمّلة مسبقاً — فوري بدون أي طلب شبكة إضافي
    const seen = new Set<number>();
    const matched: MediaItem[] = [];
    for (const item of searchPool) {
      const titleAr = (item.title ?? item.name ?? "").toLowerCase();
      const titleEn = (item.title_en ?? "").toLowerCase();
      // نضيف original_title/original_name كمصدر بحث ثالث — TMDB يرجّعه دايماً باللغة
      // الأصلية للعمل بغض النظر عن توفر ترجمة، بعكس title_en اللي ممكن يرجع نسخة
      // مكررة من العنوان العربي لو TMDB ما وفّر ترجمة إنجليزية صريحة لهذا العمل تحديداً.
      const titleOriginal = (item.original_title ?? item.original_name ?? "").toLowerCase();
      if (
        (titleAr.includes(q) || titleEn.includes(q) || titleOriginal.includes(q)) &&
        !seen.has(item.id)
      ) {
        seen.add(item.id);
        matched.push(item);
      }
    }
    setResults(matched);
  }, [query, searchPool]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-2xl bg-surfaceDark px-4 py-3">
          <SearchIcon className="h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="صيف ابدي"
            className="w-full bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none"
          />
        </div>
        {searchPoolLoading && searchPool.length === 0 && (
          <p className="mt-2 px-1 text-[12px] text-white/40">جاري تجهيز فهرس البحث بالخلفية…</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {query.trim().length >= 2 && results.length === 0 && (
          <p className="mt-10 text-center text-[14px] text-white/50">ما فيه نتائج مطابقة</p>
        )}
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {results.map((item) => (
            <MediaCard key={`${item.category}_${item.id}`} item={item} fluid onClick={() => onItemClick(item)} />
          ))}
        </div>
      </div>
    </div>
  );
}
