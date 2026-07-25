import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { LIBRARY_CATEGORIES } from "@/types/media";
import HeroCarousel from "@/components/HeroCarousel";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import CategoryRow from "@/components/CategoryRow";

export default function HomeView() {
  const {
    categories,
    heroCandidates,
    isLoading,
    isBatchLoading,
    loadError,
    hasMore,
    watchHistory,
    loadInitial,
    loadMore,
    selectItem,
    removeFromHistory,
  } = useAppStore();

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Object.keys(categories).length === 0) void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isBatchLoading) void loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isBatchLoading, loadMore]);

  const allEmpty = Object.values(categories).every((list) => list.length === 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (loadError && allEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-white/70">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px] pb-6">
      <HeroCarousel items={heroCandidates} onPlay={selectItem} />

      <ContinueWatchingRow
        entries={watchHistory}
        onResume={(entry) => selectItem(entry.item)}
        onRemove={removeFromHistory}
      />

      {LIBRARY_CATEGORIES.map((cat) => (
        <CategoryRow
          key={cat.key}
          title={cat.displayNameAr}
          items={categories[cat.key] ?? []}
          showRank={cat.key === "trending"}
          iconKey={cat.icon}
          onItemClick={selectItem}
        />
      ))}

      <div ref={sentinelRef} className="flex h-16 items-center justify-center">
        {isBatchLoading && <Spinner small />}
      </div>
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  return (
    <div
      className={`animate-spin rounded-full border-brandRed border-t-transparent ${small ? "h-6 w-6 border-2" : "h-9 w-9 border-[3px]"}`}
    />
  );
}
