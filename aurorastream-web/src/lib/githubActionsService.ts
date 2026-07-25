/**
 * يشغّل ملف update_library.js بمستودعك عبر GitHub Actions workflow_dispatch API — بنفس
 * آلية إصدار أندرويد بالضبط (زر "طلب" يرسل معاملات، والسكربت يقرأها كمتغيرات بيئة).
 *
 * تنبيه أمني مهم: هذا الطلب يحتاج توكن GitHub بصلاحية تشغيل الـ workflows على مستودعك.
 * التوكن يُقرأ من الإعدادات المحلية (localStorage بمتصفح المستخدم نفسه) — أبداً لا يُبنى
 * أو يُخزَّن داخل كود الموقع المنشور. راجع src/store/useAppStore.ts للتفاصيل.
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

/** اسم ملف الـ workflow المستهدف — عدّله هنا لو اسمه مختلف بمستودعك. */
const WORKFLOW_FILE = "update-library.yml";

export async function dispatchLibraryUpdate(
  repo: string,
  branch: string,
  token: string,
  payload: RequestPayload
): Promise<DispatchResult> {
  if (!token.trim()) {
    return { ok: false, message: "لازم تحط توكن GitHub بالإعدادات أولاً لاستخدام هذي الميزة." };
  }

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`;

  // نرسل بس المفاتيح اللي فيها قيمة فعلية — workflow_dispatch inputs كلها نصوص، وإرسال
  // مفتاح فاضي يجوز يفهمه السكربت كطلب حقيقي بدل ما يتجاهله. لازم أسماء المفاتيح هنا
  // تطابق بالضبط أسماء الـ inputs المعرّفة بملف .github/workflows/update-library.yml
  // (وهي بدورها المتغيرات اللي يقرأها update_library.js: REQUEST_TITLE, REQUEST_ID,
  // REQUEST_TYPE, REQUEST_ID_TYPE, OLD_ID, SEASONS_SPLIT).
  const inputs: Record<string, string> = {};
  if (payload.requestTitle) inputs.REQUEST_TITLE = payload.requestTitle;
  if (payload.requestId) inputs.REQUEST_ID = payload.requestId;
  if (payload.requestType) inputs.REQUEST_TYPE = payload.requestType;
  if (payload.requestIdType) inputs.REQUEST_ID_TYPE = payload.requestIdType;
  if (payload.oldId) inputs.OLD_ID = payload.oldId;
  if (payload.seasonsSplit) inputs.SEASONS_SPLIT = payload.seasonsSplit;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token.trim()}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: branch, inputs }),
    });

    if (res.status === 204) {
      return { ok: true, message: "تم إرسال الطلب بنجاح! راقب تبويب Actions بالمستودع لمتابعة التقدم." };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "التوكن غير صالح أو ما عنده صلاحية كافية (Actions: write)." };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `تعذّر إيجاد الـ workflow "${WORKFLOW_FILE}". تأكد من اسمه الصحيح بمجلد .github/workflows.`,
      };
    }
    const text = await res.text().catch(() => "");
    return { ok: false, message: `فشل الطلب (HTTP ${res.status}). ${text}`.trim() };
  } catch (e) {
    return {
      ok: false,
      message: "تعذّر الاتصال بواجهة GitHub API. تحقق من اتصالك بالإنترنت أو من صلاحية الـ CORS.",
    };
  }
}
