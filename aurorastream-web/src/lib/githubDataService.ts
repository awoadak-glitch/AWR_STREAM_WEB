import type { MediaItem } from "@/types/media";

/**
 * يقرأ نفس بنية data/index.json + data/<file>.json اللي تستخدمها نسخة أندرويد/iOS —
 * مباشرة من raw.githubusercontent.com، بدون أي سيرفر خلفي. هذا النطاق يرسل
 * Access-Control-Allow-Origin: * افتراضياً، فيشتغل من أي صفحة ويب بدون بروكسي.
 */
export class GitHubDataService {
  private rawBase(repo: string, branch: string): string {
    return `https://raw.githubusercontent.com/${repo}/${branch}`;
  }

  async fetchIndex(repo: string, branch = "main"): Promise<string[]> {
    const ts = Date.now();
    const url = `${this.rawBase(repo, branch)}/data/index.json?t=${ts}`;
    const data = await this.execute(url);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async fetchFile(repo: string, file: string, branch = "main"): Promise<MediaItem[]> {
    const ts = Date.now();
    const url = `${this.rawBase(repo, branch)}/data/${file}?t=${ts}`;
    const data = await this.execute(url);
    if (!data) return [];
    const category = file.split("_")[0];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item: MediaItem) => ({ ...item, category }));
    } catch {
      return [];
    }
  }

  private async execute(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  /** يرتب أسماء الملفات من الأحدث للأقدم حسب أطول رقم (timestamp) موجود بالاسم. */
  sortByTimestampDesc(files: string[]): string[] {
    const extractTimestamp = (f: string): number => {
      let best = "";
      let current = "";
      for (const ch of f) {
        if (ch >= "0" && ch <= "9") {
          current += ch;
        } else {
          if (current.length > best.length) best = current;
          current = "";
        }
      }
      if (current.length > best.length) best = current;
      return best ? parseInt(best, 10) : 0;
    };
    return [...files].sort((a, b) => extractTimestamp(b) - extractTimestamp(a));
  }
}
