/**
 * يرسل طلبات الإضافة/الإصلاح إلى Vercel Function داخل /api.
 * توكن GitHub يبقى على الخادم داخل Environment Variables ولا يصل للمتصفح.
 */

export interface RequestPayload {
  requestTitle?: string;
  requestId?: string;
  requestType?: "movie" | "tv" | "";
  requestIdType?: "tmdb" | "imdb";
  oldId?: string;
  seasonsSplit?: string;
}

export interface DispatchResult {
  ok: boolean;
  message: string;
}

export async function dispatchLibraryUpdate(payload: RequestPayload): Promise<DispatchResult> {
  try {
    const res = await fetch("/api/dispatch-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as DispatchResult | null;
    if (data && typeof data.ok === "boolean" && typeof data.message === "string") {
      return data;
    }

    return {
      ok: false,
      message: `فشل الطلب (HTTP ${res.status}).`,
    };
  } catch {
    return {
      ok: false,
      message: "تعذّر الاتصال بخادم الطلبات. تأكد أن الموقع منشور على Vercel.",
    };
  }
}
