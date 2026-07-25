import type { MediaItem } from "@/types/media";
import { GitHubDataService } from "./githubDataService";

export class LibraryRepository {
  private dataService: GitHubDataService;
  private fileQueue: string[] = [];
  private allFilesCache: string[] = [];
  private searchCache: MediaItem[] | null = null;
  private searchCachePromise: Promise<MediaItem[]> | null = null;

  constructor(dataService = new GitHubDataService()) {
    this.dataService = dataService;
  }

  get hasMoreFiles(): boolean {
    return this.fileQueue.length > 0;
  }

  async refreshIndex(repo: string, branch: string): Promise<string[]> {
    const files = await this.dataService.fetchIndex(repo, branch);
    const sorted = this.dataService.sortByTimestampDesc(files);
    this.allFilesCache = sorted;
    this.fileQueue = [...sorted];
    this.searchCache = null;
    this.searchCachePromise = null;
    return sorted;
  }

  async loadNextBatch(repo: string, branch: string, count: number): Promise<MediaItem[]> {
    if (this.fileQueue.length === 0) return [];
    const batch = this.fileQueue.splice(0, count);
    const results = await Promise.all(batch.map((file) => this.dataService.fetchFile(repo, file, branch)));
    return results.flat();
  }

  /**
   * يحمّل كل ملفات المكتبة لأجل البحث، مع كاش داخلي — يُستدعى بشكل استباقي فور فتح
   * الموقع (انظر useAppStore) بدل ما ننتظر أول ضغطة كتابة، عشان البحث يكون فوري لما
   * تكبر المكتبة.
   */
  async loadAllForSearch(repo: string, branch: string): Promise<MediaItem[]> {
    if (this.searchCache) return this.searchCache;
    if (this.searchCachePromise) return this.searchCachePromise;

    this.searchCachePromise = (async () => {
      const files = this.allFilesCache.length > 0 ? this.allFilesCache : await this.dataService.fetchIndex(repo, branch);
      const results = await Promise.all(files.map((file) => this.dataService.fetchFile(repo, file, branch)));
      const all = results.flat();
      this.searchCache = all;
      return all;
    })();

    return this.searchCachePromise;
  }

  searchLocally(query: string, pool: MediaItem[]): MediaItem[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const seen = new Set<number>();
    const results: MediaItem[] = [];
    for (const item of pool) {
      const titleAr = (item.title ?? item.name ?? "").toLowerCase();
      const titleEn = (item.title_en ?? "").toLowerCase();
      if ((titleAr.includes(q) || titleEn.includes(q)) && !seen.has(item.id)) {
        seen.add(item.id);
        results.push(item);
      }
    }
    return results;
  }
}
