import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import HomeView from "@/views/HomeView";
import SearchView from "@/views/SearchView";
import SettingsView from "@/views/SettingsView";
import DetailsView from "@/views/DetailsView";
import PlayerView from "@/views/PlayerView";
import { HomeIcon, SearchIcon, SettingsIcon } from "@/components/Icons";

type Tab = "home" | "search" | "settings";

const TABS: { key: Tab; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { key: "home", label: "الرئيسية", icon: HomeIcon },
  { key: "search", label: "بحث", icon: SearchIcon },
  { key: "settings", label: "الإعدادات", icon: SettingsIcon },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("home");

  const {
    selectedItem,
    playingUrl,
    episodeContext,
    selectItem,
    clearSelectedItem,
    playMovie,
    playEpisode,
    stopPlayback,
    hasNextEpisode,
    playNextEpisode,
  } = useAppStore();

  return (
    <div className="relative h-screen w-full overflow-hidden bg-deepBlack">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto pb-24">
          {tab === "home" && <HomeView />}
          {tab === "search" && <SearchView onItemClick={selectItem} />}
          {tab === "settings" && <SettingsView />}
        </div>

        <FloatingTabBar active={tab} onChange={setTab} />
      </div>

      {/* الطبقات تُرسم آخر شي بترتيب واضح (تفاصيل ثم مشغّل) عشان تطلع دايماً فوق أي
          تبويب فعّال — بدون أي "نافذة منفصلة" ممكن يختل ترتيبها. تفاصيل العمل تبقى
          مرسومة بالخلفية حتى أثناء تشغيل المشغّل فوقها، فلما تسكّر المشغّل ترجع تلقائياً
          لنفس شاشة التفاصيل بدل ما ترجعك للرئيسية. */}
      {selectedItem && !playingUrl && (
        <DetailsView
          item={selectedItem}
          onDismiss={clearSelectedItem}
          onPlayMovie={playMovie}
          onPlayEpisode={playEpisode}
        />
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

function FloatingTabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex justify-center pb-3">
      <div className="pointer-events-auto flex items-center gap-1 rounded-[26px] bg-surfaceDark px-2 py-2 shadow-2xl">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex min-w-[76px] flex-col items-center gap-1 rounded-full px-4 py-2 transition ${
                isActive ? "text-brandRed" : "text-white/50 hover:text-white/70"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
