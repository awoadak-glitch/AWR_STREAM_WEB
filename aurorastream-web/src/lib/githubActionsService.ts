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

    const responseText = await res.text();
    let data: DispatchResult | null = null;

    try {
      data = JSON.parse(responseText) as DispatchResult;
    } catch {
      data = null;
    }

    if (data && typeof data.ok === "boolean" && typeof data.message === "string") {
      return data;
    }

    const vercelRequestId = res.headers.get("x-vercel-id");
    const requestSuffix = vercelRequestId ? ` — Request ID: ${vercelRequestId}` : "";

    return {
      ok: false,
      message: `خادم Vercel أعاد استجابة غير صالحة (HTTP ${res.status})${requestSuffix}. راجع Runtime Logs.`,
    };
  } catch (error) {
    console.error("dispatchLibraryUpdate network error", error);
    return {
      ok: false,
      message: "تعذّر الاتصال بخادم الطلبات. تأكد أن الموقع منشور على Vercel وأن /api/dispatch-library موجود.",
    };
  }
}
