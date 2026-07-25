import { create } from "zustand";
import type { MediaItem, LibraryCategoryKey } from "@/types/media";
import type { WatchHistoryEntry } from "@/types/watchHistory";
import { nextEpisodeOf } from "@/types/watchHistory";
import { LibraryRepository } from "@/lib/libraryRepository";

const VIDAPI_BASE = "https://vaplayer.ru/embed";

const SETTINGS_KEY = "aurora_settings_v1";
const HISTORY_KEY = "aurora_watch_history_v1";
const MAX_HISTORY = 25;

// مصدر البيانات صار ثابتاً تلقائياً — مو معروض بواجهة المستخدم، عشان الزوار ما
// يحتاجون يعرفون أو يعدّلون هذي القيم إطلاقاً.
const FIXED_REPO = "awoadak-glitch/AWR_STREAM_WEB";
const FIXED_BRANCH = "main";

export interface AppSettings {
  repo: string;
  branch: string;
  /** توكن GitHub لتشغيل ميزة "طلب/إصلاح" — يُخزَّن محلياً بمتصفح المستخدم فقط
   * (localStorage)، أبداً داخل كود الموقع المبني أو المستودع. كل شخص يحط توكنه
   * الخاص بمتصفحه لو يبي يستخدم الميزة؛ ما فيه توكن مشترك مبني بالموقع. */
  githubToken: string;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { repo: FIXED_REPO, branch: FIXED_BRANCH, githubToken: parsed.githubToken ?? "" };
    }
  } catch {
    /* ignore */
  }
  return { repo: FIXED_REPO, branch: FIXED_BRANCH, githubToken: "" };
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadHistory(): WatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveHistory(entries: WatchHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export interface EpisodeContext {
  item: MediaItem;
  season: number;
  episode: number;
}

interface AppState {
  // Settings
  settings: AppSettings;
  updateGithubToken: (token: string) => void;

  // Library
  categories: Record<string, MediaItem[]>;
  heroCandidates: MediaItem[];
  isLoading: boolean;
  isBatchLoading: boolean;
  loadError: string | null;
  hasMore: boolean;
  loadInitial: () => Promise<void>;
  loadMore: () => Promise<void>;

  // Search
  searchPool: MediaItem[];
  searchPoolLoading: boolean;
  prewarmSearch: () => Promise<void>;

  // Selection / playback
  selectedItem: MediaItem | null;
  playingUrl: string | null;
  episodeContext: EpisodeContext | null;
  selectItem: (item: MediaItem) => void;
  clearSelectedItem: () => void;
  playMovie: (item: MediaItem) => void;
  playEpisode: (item: MediaItem, season: number, episode: number) => void;
  stopPlayback: () => void;
  playNextEpisode: () => void;
  hasNextEpisode: () => boolean;

  // Watch history
  watchHistory: WatchHistoryEntry[];
  removeFromHistory: (itemId: number) => void;
  lastWatchedPosition: (itemId: number) => { season: number; episode: number } | null;

  // Request / repair / seasons-split (triggers the GitHub Actions workflow)
  requestDialogOpen: boolean;
  openRequestDialog: (repairItem?: MediaItem) => void;
  closeRequestDialog: () => void;
  requestRepairItem: MediaItem | null;
}

const repository = new LibraryRepository();

export const useAppStore = create<AppState>((set, get) => ({
  settings: loadSettings(),

  updateGithubToken: (token) => {
    const next = { ...get().settings, githubToken: token.trim() };
    set({ settings: next });
    saveSettings(next);
  },

  categories: {},
  heroCandidates: [],
  isLoading: true,
  isBatchLoading: false,
  loadError: null,
  hasMore: true,

  loadInitial: async () => {
    const { settings } = get();
    if (!settings.repo) {
      set({ isLoading: false, loadError: "أدخل مستودع GitHub بالإعدادات أول (owner/repo)" });
      return;
    }
    set({ isLoading: true, loadError: null, categories: {}, heroCandidates: [] });
    try {
      await repository.refreshIndex(settings.repo, settings.branch);
    } catch {
      set({ isLoading: false, loadError: "تعذر الوصول إلى المستودع. تحقق من الاسم والاتصال." });
      return;
    }
    await get().loadMore();
    set({ isLoading: false });
    // تحميل استباقي بالخلفية لأجل البحث الفوري لاحقاً — لا ننتظره
    void get().prewarmSearch();
  },

  loadMore: async () => {
    if (get().isBatchLoading) return;
    const { settings } = get();
    set({ isBatchLoading: true });
    const batch = await repository.loadNextBatch(settings.repo, settings.branch, 6);

    set((state) => {
      const categories = { ...state.categories };
      for (const item of batch) {
        const cat = item.category ?? "trending";
        categories[cat] = [...(categories[cat] ?? []), item];
      }
      const heroCandidates = (categories["trending"] ?? []).slice(0, 5);
      return { categories, heroCandidates, isBatchLoading: false, hasMore: repository.hasMoreFiles };
    });
  },

  searchPool: [],
  searchPoolLoading: false,

  prewarmSearch: async () => {
    if (get().searchPool.length > 0 || get().searchPoolLoading) return;
    const { settings } = get();
    if (!settings.repo) return;
    set({ searchPoolLoading: true });
    try {
      const all = await repository.loadAllForSearch(settings.repo, settings.branch);
      set({ searchPool: all, searchPoolLoading: false });
    } catch {
      set({ searchPoolLoading: false });
    }
  },

  selectedItem: null,
  playingUrl: null,
  episodeContext: null,

  selectItem: (item) => set({ selectedItem: item }),
  clearSelectedItem: () => set({ selectedItem: null }),

  playMovie: (item) => {
    set({ playingUrl: `${VIDAPI_BASE}/movie/${item.id}?autoplay=1`, episodeContext: null });
    recordHistory(set, get, item);
  },

  playEpisode: (item, season, episode) => {
    set({
      playingUrl: `${VIDAPI_BASE}/tv/${item.id}/${season}/${episode}?autoplay=1`,
      episodeContext: { item, season, episode },
    });
    recordHistory(set, get, item, season, episode);
  },

  stopPlayback: () => set({ playingUrl: null, episodeContext: null }),

  hasNextEpisode: () => {
    const ctx = get().episodeContext;
    if (!ctx) return false;
    return nextEpisodeOf({ item: ctx.item, season: ctx.season, episode: ctx.episode, lastWatchedAt: 0 }) !== null;
  },

  playNextEpisode: () => {
    const ctx = get().episodeContext;
    if (!ctx) return;
    const next = nextEpisodeOf({ item: ctx.item, season: ctx.season, episode: ctx.episode, lastWatchedAt: 0 });
    if (!next) return;
    get().playEpisode(ctx.item, next.season, next.episode);
  },

  watchHistory: loadHistory(),

  removeFromHistory: (itemId) => {
    const next = get().watchHistory.filter((e) => e.item.id !== itemId);
    set({ watchHistory: next });
    saveHistory(next);
  },

  lastWatchedPosition: (itemId) => {
    const entry = get().watchHistory.find((e) => e.item.id === itemId);
    if (!entry?.season || !entry?.episode) return null;
    return { season: entry.season, episode: entry.episode };
  },

  requestDialogOpen: false,
  requestRepairItem: null,
  openRequestDialog: (repairItem) => set({ requestDialogOpen: true, requestRepairItem: repairItem ?? null }),
  closeRequestDialog: () => set({ requestDialogOpen: false, requestRepairItem: null }),
}));

function recordHistory(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  item: MediaItem,
  season?: number,
  episode?: number
) {
  const filtered = get().watchHistory.filter((e) => e.item.id !== item.id);
  const entry: WatchHistoryEntry = { item, season: season ?? null, episode: episode ?? null, lastWatchedAt: Date.now() };
  const next = [entry, ...filtered].slice(0, MAX_HISTORY);
  set({ watchHistory: next });
  saveHistory(next);
}

export function categoryKeys(): LibraryCategoryKey[] {
  return ["trending", "latest", "movies", "series", "kdrama", "anime"];
}
