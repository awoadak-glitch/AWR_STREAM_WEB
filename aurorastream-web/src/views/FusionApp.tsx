import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import DetailsView from "@/views/DetailsView";
import PlayerView from "@/views/PlayerView";
import type { MediaItem } from "@/types/media";
import { displayTitle, posterUrl } from "@/types/media";
import {
  type DramaRecord,
  type DramaSection,
  dramaBackdrop,
  dramaDescription,
  dramaId,
  dramaImage,
  dramaRating,
  dramaSubtitle,
  dramaTitle,
  dramaType,
  dramaYear,
  episodesFromSeason,
  inspectDramaSource,
  loadDramaDetails,
  loadDramaSection,
  loadEpisodeSources,
  loadMovieSources,
  loadSeasons,
  recordsFrom,
  searchDrama,
  sourceName,
  sourceUrl,
} from "@/lib/dramaApi";

type Tab = "anime" | "series" | "movies" | "channels";

const TAB_META: Array<{ key: Tab; label: string; title: string }> = [
  { key: "anime", label: "أنمي", title: "الصفحة الرئيسية" },
  { key: "series", label: "مسلسلات", title: "المسلسلات" },
  { key: "movies", label: "أفلام", title: "الأفلام" },
  { key: "channels", label: "قنوات", title: "القنوات" },
];

export default function FusionApp() {
  const [tab, setTab] = useState<Tab>("anime");
  const [searchOpen, setSearchOpen] = useState(false);
  const active = TAB_META.find((entry) => entry.key === tab) ?? TAB_META[0];

  const {
    selectedItem,
    playingUrl,
    episodeContext,
    clearSelectedItem,
    playMovie,
    playEpisode,
    stopPlayback,
    hasNextEpisode,
    playNextEpisode,
  } = useAppStore();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f7f8] font-sans text-[#121212]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-4">
          <button className="flex h-11 w-11 items-center justify-center rounded-full active:bg-black/5" aria-label="القائمة">
            <MenuIcon />
          </button>
          <div className="text-center">
            <h1 className="text-[24px] font-black tracking-tight">{active.title}</h1>
            {tab !== "anime" && <p className="mt-0.5 text-[10px] font-bold text-black/35">عالم الدراما × Anime Witcher</p>}
          </div>
          <button
            onClick={() => setSearchOpen((value) => !value)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${searchOpen ? "bg-[#ffd900]" : "active:bg-black/5"}`}
            aria-label="بحث"
          >
            <SearchIcon />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl pb-28">
        {tab === "anime" ? (
          <AnimeTab searchOpen={searchOpen} />
        ) : (
          <DramaTab section={tab} searchOpen={searchOpen} />
        )}
      </main>

      <BottomTabs active={tab} onChange={(next) => { setTab(next); setSearchOpen(false); }} />

      {selectedItem && !playingUrl && (
        <DetailsView item={selectedItem} onDismiss={clearSelectedItem} onPlayMovie={playMovie} onPlayEpisode={playEpisode} />
      )}
      {playingUrl && (
        <PlayerView
          url={playingUrl}
          episodeLabel={episodeContext ? `الموسم ${episodeContext.season} • الحلقة ${episodeContext.episode}` : null}
          hasNextEpisode={hasNextEpisode()}
          onNextEpisode={playNextEpisode}
          onClose={stopPlayback}
        />
      )}
    </div>
  );
}

function AnimeTab({ searchOpen }: { searchOpen: boolean }) {
  const { categories, heroCandidates, isLoading, loadError, loadInitial, selectItem } = useAppStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (Object.keys(categories).length === 0) void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allItems = useMemo(() => {
    const seen = new Set<number>();
    const list: MediaItem[] = [];
    Object.values(categories).flat().forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        list.push(item);
      }
    });
    return list;
  }, [categories]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ar");
    if (!needle) return [];
    return allItems.filter((item) => displayTitle(item).toLocaleLowerCase("ar").includes(needle)).slice(0, 60);
  }, [allItems, query]);

  if (isLoading) return <CenteredSpinner />;
  if (loadError && allItems.length === 0) return <ErrorState text={loadError} />;

  if (searchOpen) {
    return (
      <div className="px-4 pt-4">
        <SearchBox value={query} onChange={setQuery} placeholder="ابحث عن أنمي..." />
        {query.trim() ? <AnimeGrid items={filtered} onItemClick={selectItem} /> : <Hint text="اكتب اسم الأنمي الذي تبحث عنه" />}
      </div>
    );
  }

  const hero = heroCandidates[0] ?? categories.anime?.[0] ?? categories.trending?.[0];
  const latest = (categories.latest ?? categories.anime ?? []).slice(0, 18);
  const popular = (categories.trending ?? []).slice(0, 18);
  const anime = (categories.anime ?? []).slice(0, 18);

  return (
    <div className="pb-4">
      {hero && <AnimeHero item={hero} onClick={() => selectItem(hero)} />}
      <AnimeRow title="حلقات جديدة" items={latest} onItemClick={selectItem} />
      <AnimeRow title="الأكثر شهرة هذا الموسم" items={popular} onItemClick={selectItem} />
      <AnimeRow title="أفضل الأنميات عالمياً" items={anime.length ? anime : popular} onItemClick={selectItem} />
    </div>
  );
}

function AnimeHero({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  const poster = posterUrl(item);
  return (
    <div className="px-4 pt-5">
      <button onClick={onClick} className="relative h-[330px] w-full overflow-hidden rounded-[28px] bg-[#e8e8e8] text-right shadow-[0_12px_28px_rgba(0,0,0,0.12)] active:scale-[0.99]">
        {poster && <img src={poster} alt={displayTitle(item)} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <p className="max-w-[90%] text-[24px] font-black leading-tight">{displayTitle(item)}</p>
          <div className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md">شاهد الآن</div>
        </div>
      </button>
    </div>
  );
}

function AnimeRow({ title, items, onItemClick }: { title: string; items: MediaItem[]; onItemClick: (item: MediaItem) => void }) {
  if (!items.length) return null;
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-end justify-between px-4">
        <h2 className="text-[22px] font-black text-black/60">{title}</h2>
        <span className="text-xs font-bold text-black/35">عرض المزيد</span>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => <AnimeCard key={`${item.category}-${item.id}`} item={item} onClick={() => onItemClick(item)} />)}
      </div>
    </section>
  );
}

function AnimeGrid({ items, onItemClick }: { items: MediaItem[]; onItemClick: (item: MediaItem) => void }) {
  if (!items.length) return <Hint text="لا توجد نتائج" />;
  return (
    <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
      {items.map((item) => <AnimeCard key={`${item.category}-${item.id}`} item={item} onClick={() => onItemClick(item)} fluid />)}
    </div>
  );
}

function AnimeCard({ item, onClick, fluid }: { item: MediaItem; onClick: () => void; fluid?: boolean }) {
  const poster = posterUrl(item);
  return (
    <button onClick={onClick} className={`shrink-0 text-right active:scale-95 ${fluid ? "w-full" : "w-[145px]"}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] bg-[#e6e6e6] shadow-sm">
        {poster && <img src={poster} alt={displayTitle(item)} className="h-full w-full object-cover" loading="lazy" />}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
      </div>
      <p className="mt-2 truncate px-1 text-[15px] font-black">{displayTitle(item)}</p>
    </button>
  );
}

function DramaTab({ section, searchOpen }: { section: DramaSection; searchOpen: boolean }) {
  const [items, setItems] = useState<DramaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<DramaRecord | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DramaRecord[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    void loadDramaSection(section)
      .then((data) => { if (alive) setItems(data); })
      .catch(() => { if (alive) setError("تعذر تحميل المحتوى من عالم الدراما"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [section]);

  useEffect(() => {
    const needle = query.trim();
    if (!searchOpen || !needle) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchDrama(needle)
        .then((results) => {
          const filtered = section === "channels"
            ? results.filter((item) => dramaType(item) === "channel")
            : results.filter((item) => {
                const type = dramaType(item);
                return type === "unknown" || (section === "series" ? type === "series" : type === "movie");
              });
          setSearchResults(filtered);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, searchOpen, section]);

  if (loading) return <CenteredSpinner />;
  if (error && !items.length) return <ErrorState text={error} />;

  const shown = searchOpen ? searchResults : items;
  const hero = !searchOpen ? items[0] : null;
  const title = section === "series" ? "أحدث المسلسلات" : section === "movies" ? "أحدث الأفلام" : "قنوات بث مباشر";

  return (
    <div className="pb-5">
      {searchOpen && (
        <div className="px-4 pt-4">
          <SearchBox value={query} onChange={setQuery} placeholder={section === "series" ? "ابحث عن مسلسل..." : section === "movies" ? "ابحث عن فيلم..." : "ابحث عن قناة..."} />
        </div>
      )}

      {hero && <DramaHero item={hero} section={section} onClick={() => setSelected(hero)} />}

      <section className="mt-6 px-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[23px] font-black text-black/65">{searchOpen ? "نتائج البحث" : title}</h2>
          {!searchOpen && <span className="rounded-full bg-[#ffd900] px-3 py-1 text-[11px] font-black">مباشر من عالم الدراما</span>}
        </div>
        {searchOpen && !query.trim() ? (
          <Hint text="اكتب اسم العمل الذي تبحث عنه" />
        ) : searching ? (
          <div className="py-16"><CenteredSpinner compact /></div>
        ) : shown.length ? (
          <div className={`grid gap-x-3 gap-y-6 ${section === "channels" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"}`}>
            {shown.map((item, index) => (
              <DramaCard key={`${dramaId(item)}-${index}`} item={item} channel={section === "channels"} onClick={() => setSelected(item)} />
            ))}
          </div>
        ) : (
          <Hint text="لا توجد نتائج حالياً" />
        )}
      </section>

      {selected && <DramaDetails item={selected} section={section} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DramaHero({ item, section, onClick }: { item: DramaRecord; section: DramaSection; onClick: () => void }) {
  const image = dramaBackdrop(item) || dramaImage(item);
  return (
    <div className="px-4 pt-5">
      <button onClick={onClick} className="relative h-[310px] w-full overflow-hidden rounded-[28px] bg-[#dedede] text-right shadow-[0_14px_32px_rgba(0,0,0,0.13)] active:scale-[0.99]">
        {image && <img src={image} alt={dramaTitle(item)} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <span className="rounded-full bg-[#ffd900] px-3 py-1 text-[11px] font-black text-black">{section === "series" ? "مسلسل" : section === "movies" ? "فيلم" : "بث مباشر"}</span>
          <h2 className="mt-3 text-[27px] font-black leading-tight">{dramaTitle(item)}</h2>
          <p className="mt-2 line-clamp-1 text-sm font-bold text-white/75">{[dramaYear(item), dramaSubtitle(item)].filter(Boolean).join(" • ")}</p>
        </div>
      </button>
    </div>
  );
}

function DramaCard({ item, channel, onClick }: { item: DramaRecord; channel: boolean; onClick: () => void }) {
  const image = dramaImage(item);
  return (
    <button onClick={onClick} className="min-w-0 text-right transition active:scale-95">
      <div className={`relative overflow-hidden bg-[#e6e6e6] shadow-sm ${channel ? "aspect-video rounded-[16px]" : "aspect-[2/3] rounded-[14px]"}`}>
        {image && <img src={image} alt={dramaTitle(item)} className="h-full w-full object-cover" loading="lazy" />}
        {!image && <div className="flex h-full items-center justify-center text-3xl text-black/15">▶</div>}
        {!channel && dramaRating(item) && (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-black text-white">★ {dramaRating(item)}</span>
        )}
      </div>
      <p className="mt-2 truncate px-1 text-[14px] font-black">{dramaTitle(item)}</p>
      <p className="mt-0.5 truncate px-1 text-[11px] font-bold text-black/40">{channel ? dramaSubtitle(item) || "بث مباشر" : dramaYear(item) || dramaSubtitle(item)}</p>
    </button>
  );
}

function DramaDetails({ item, section, onClose }: { item: DramaRecord; section: DramaSection; onClose: () => void }) {
  const [details, setDetails] = useState(item);
  const [seasons, setSeasons] = useState<DramaRecord[]>([]);
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [sources, setSources] = useState<DramaRecord[]>([]);
  const [sourceTitle, setSourceTitle] = useState("");
  const [loadingSources, setLoadingSources] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void loadDramaDetails(item, section).then((value) => { if (alive) setDetails(value); }).catch(() => undefined);
    if (section === "series") {
      void loadSeasons(item).then((value) => { if (alive) setSeasons(value); }).catch(() => undefined);
    }
    if (section === "movies") {
      setLoadingSources(true);
      void loadMovieSources(item).then((value) => { if (alive) setSources(value); }).catch(() => undefined).finally(() => { if (alive) setLoadingSources(false); });
    }
    if (section === "channels") {
      const direct = sourceUrl(item);
      const nested = recordsFrom(item.sources ?? item.source ?? item.streams);
      if (nested.length) setSources(nested);
      else if (direct) setSources([item]);
    }
    return () => { alive = false; };
  }, [item, section]);

  useEffect(() => {
    if (section !== "channels") return;
    const nested = recordsFrom(details.sources ?? details.source ?? details.streams);
    if (nested.length) setSources(nested);
    else if (sourceUrl(details)) setSources([details]);
  }, [details, section]);

  const currentEpisodes = seasons[seasonIndex] ? episodesFromSeason(seasons[seasonIndex]) : [];

  async function showEpisodeSources(episode: DramaRecord) {
    setSourceTitle(dramaTitle(episode));
    setLoadingSources(true);
    setSources([]);
    try { setSources(await loadEpisodeSources(episode)); } finally { setLoadingSources(false); }
  }

  async function playSource(source: DramaRecord) {
    const raw = sourceUrl(source);
    if (!raw) return;
    let resolved = raw;
    if (!/\.(mp4|webm|m3u8)(?:$|\?)/i.test(raw)) {
      const inspected = await inspectDramaSource(raw);
      resolved = inspected[0] || raw;
    }
    setPlaying(resolved);
  }

  const backdrop = dramaBackdrop(details) || dramaImage(details);
  const title = dramaTitle(details);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#f7f7f8] animate-fade-in">
      <div className="relative min-h-[420px] overflow-hidden bg-black">
        {backdrop && <img src={backdrop} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-85" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/20" />
        <button onClick={onClose} className="absolute right-5 top-5 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md"><CloseIcon /></button>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <h2 className="text-[30px] font-black leading-tight">{title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-white/75">
            {dramaYear(details) && <span>{dramaYear(details)}</span>}
            {dramaRating(details) && <span>★ {dramaRating(details)}</span>}
            {dramaSubtitle(details) && <span>{dramaSubtitle(details)}</span>}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-5">
        {dramaDescription(details) && <p className="text-[15px] font-semibold leading-8 text-black/65">{dramaDescription(details)}</p>}

        {section === "series" && (
          <div className="mt-7">
            <h3 className="mb-4 text-[24px] font-black">الحلقات</h3>
            {seasons.length > 0 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {seasons.map((season, index) => (
                  <button key={`${dramaId(season)}-${index}`} onClick={() => setSeasonIndex(index)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black ${index === seasonIndex ? "bg-[#ffd900] text-black" : "bg-black/5 text-black/50"}`}>
                    {dramaTitle(season) === "بدون عنوان" ? `الموسم ${index + 1}` : dramaTitle(season)}
                  </button>
                ))}
              </div>
            )}
            {currentEpisodes.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {currentEpisodes.map((episode, index) => (
                  <button key={`${dramaId(episode)}-${index}`} onClick={() => void showEpisodeSources(episode)} className="rounded-[18px] bg-white p-4 text-right shadow-sm ring-1 ring-black/5 active:scale-[0.98]">
                    <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#ffd900] text-sm font-black">▶</span>
                    <p className="line-clamp-2 text-sm font-black">{dramaTitle(episode) === "بدون عنوان" ? `الحلقة ${index + 1}` : dramaTitle(episode)}</p>
                  </button>
                ))}
              </div>
            ) : <Hint text={seasons.length ? "لا توجد حلقات في هذا الموسم" : "جارٍ جلب المواسم والحلقات..."} />}
          </div>
        )}

        {(section === "movies" || section === "channels") && (
          <div className="mt-7">
            <h3 className="mb-4 text-[24px] font-black">{section === "movies" ? "سيرفرات المشاهدة والتنزيل" : "سيرفرات القناة"}</h3>
            <SourceList sources={sources} loading={loadingSources} onPlay={playSource} />
          </div>
        )}

        {section === "series" && (sources.length > 0 || loadingSources) && (
          <div className="mt-7">
            <h3 className="mb-4 text-[22px] font-black">{sourceTitle || "سيرفرات الحلقة"}</h3>
            <SourceList sources={sources} loading={loadingSources} onPlay={playSource} />
          </div>
        )}
      </div>

      {playing && <DramaPlayer url={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function SourceList({ sources, loading, onPlay }: { sources: DramaRecord[]; loading: boolean; onPlay: (source: DramaRecord) => Promise<void> }) {
  if (loading) return <div className="py-8"><CenteredSpinner compact /></div>;
  if (!sources.length) return <Hint text="لا توجد سيرفرات متاحة حالياً" />;
  return (
    <div className="space-y-3">
      {sources.map((source, index) => {
        const url = sourceUrl(source);
        return (
          <div key={`${sourceName(source, index)}-${index}`} className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-sm ring-1 ring-black/5">
            <button onClick={() => void onPlay(source)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#ffd900] active:scale-95"><PlayIcon /></button>
            <button onClick={() => void onPlay(source)} className="min-w-0 flex-1 text-right">
              <p className="truncate text-[15px] font-black">{sourceName(source, index)}</p>
              <p className="mt-0.5 text-[11px] font-bold text-black/35">تشغيل سريع • سيرفر {index + 1}</p>
            </button>
            {url && (
              <a href={url} target="_blank" rel="noreferrer" download className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-black/5 active:scale-95" aria-label="تنزيل"><DownloadIcon /></a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DramaPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  const directVideo = /\.(mp4|webm|ogg)(?:$|\?)/i.test(url);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white animate-fade-in" dir="rtl">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><CloseIcon /></button>
        <p className="text-sm font-black">المشغل</p>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-full bg-white/10 px-4 py-2 text-xs font-black">فتح خارجي</a>
      </div>
      <div className="flex flex-1 items-center justify-center">
        {directVideo ? (
          <video src={url} controls autoPlay playsInline className="max-h-full w-full" />
        ) : (
          <iframe src={url} allow="autoplay; fullscreen; encrypted-media" allowFullScreen className="h-full w-full border-0" title="Drama player" />
        )}
      </div>
    </div>
  );
}

function BottomTabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.07)] backdrop-blur-xl" dir="rtl">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {TAB_META.map((tab) => {
          const selected = active === tab.key;
          return (
            <button key={tab.key} onClick={() => onChange(tab.key)} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[18px] transition active:scale-95 ${selected ? "bg-[#fff4b2] text-black" : "text-black/35"}`}>
              <TabIcon tab={tab.key} active={selected} />
              <span className="text-[11px] font-black">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="flex h-14 items-center gap-3 rounded-[18px] bg-white px-4 shadow-sm ring-1 ring-black/5">
      <SearchIcon small />
      <input autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:text-black/25" />
      {value && <button onClick={() => onChange("")} className="text-xs font-black text-black/35">مسح</button>}
    </div>
  );
}

function CenteredSpinner({ compact }: { compact?: boolean }) {
  return <div className={`${compact ? "h-12" : "h-[55vh]"} flex items-center justify-center`}><div className="h-9 w-9 animate-spin rounded-full border-[3px] border-black/10 border-t-[#ffd900]" /></div>;
}

function ErrorState({ text }: { text: string }) {
  return <div className="flex h-[55vh] items-center justify-center px-8 text-center text-sm font-bold text-black/45">{text}</div>;
}

function Hint({ text }: { text: string }) {
  return <div className="flex min-h-40 items-center justify-center px-8 text-center text-sm font-bold text-black/35">{text}</div>;
}

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const common = `h-6 w-6 ${active ? "text-black" : "text-current"}`;
  if (tab === "anime") return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 18h16M6 18V8l6-4 6 4v10"/><path d="M9 12h6M12 9v6"/></svg>;
  if (tab === "series") return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 3l4 3 4-3"/></svg>;
  if (tab === "movies") return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 6h16v13H4zM4 10h16M8 6l2 4m4-4 2 4"/></svg>;
  return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="4" y="6" width="16" height="12" rx="3"/><path d="M8 3l4 3 4-3M9 12h.01M15 12h.01"/></svg>;
}

function MenuIcon() { return <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>; }
function SearchIcon({ small }: { small?: boolean }) { return <svg viewBox="0 0 24 24" className={small ? "h-5 w-5" : "h-8 w-8"} fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 6l12 12M18 6 6 18"/></svg>; }
function PlayIcon() { return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>; }
