const REPO = process.env.GITHUB_REPO || "awoadak-glitch/AWR_STREAM_WEB";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const WORKFLOW_FILE = process.env.GITHUB_WORKFLOW_FILE || "update-library.yml";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 10;
const globalRateState = globalThis.__auroraDispatchRateState || new Map();
globalThis.__auroraDispatchRateState = globalRateState;

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function getClientIp(request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  return forwarded.split(",")[0].trim();
}

function isRateLimited(ip) {
  const now = Date.now();
  const current = globalRateState.get(ip);

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    globalRateState.set(ip, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  globalRateState.set(ip, current);
  return current.count > RATE_MAX_REQUESTS;
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function validSimpleId(value) {
  return !value || /^[A-Za-z0-9_-]{1,32}$/.test(value);
}

function validateSameOrigin(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function processRequest(request) {
  // فحص سريع من المتصفح للتأكد أن Vercel Function تعمل وأن المتغير موجود.
  if (request.method === "GET") {
    return json({
      ok: true,
      service: "dispatch-library",
      tokenConfigured: Boolean(process.env.GITHUB_ACTIONS_TOKEN),
      repository: REPO,
      branch: BRANCH,
      workflow: WORKFLOW_FILE,
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, message: "الطريقة غير مسموحة." }, 405, { Allow: "GET, POST" });
  }

  if (!validateSameOrigin(request)) {
    return json({ ok: false, message: "تم رفض الطلب من مصدر خارجي." }, 403);
  }

  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return json(
      { ok: false, message: "تم إرسال طلبات كثيرة. انتظر عدة دقائق ثم حاول مجددًا." },
      429,
      { "Retry-After": "600" }
    );
  }

  const token = process.env.GITHUB_ACTIONS_TOKEN;
  if (!token) {
    return json(
      {
        ok: false,
        message: "ميزة الطلبات غير مفعلة على الخادم. أضف GITHUB_ACTIONS_TOKEN في إعدادات Vercel ثم نفّذ Redeploy.",
      },
      503
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "بيانات الطلب غير صالحة." }, 400);
  }

  const requestTitle = cleanText(body?.requestTitle, 120);
  const requestId = cleanText(body?.requestId, 32);
  const requestType = cleanText(body?.requestType, 10);
  const requestIdType = cleanText(body?.requestIdType, 10) || "tmdb";
  const oldId = cleanText(body?.oldId, 32);
  const seasonsSplit = cleanText(body?.seasonsSplit, 100).replace(/\s+/g, "");

  if (!validSimpleId(requestId) || !validSimpleId(oldId)) {
    return json({ ok: false, message: "صيغة رقم العمل غير صحيحة." }, 400);
  }
  if (requestType && !["movie", "tv"].includes(requestType)) {
    return json({ ok: false, message: "نوع المحتوى غير صحيح." }, 400);
  }
  if (!["tmdb", "imdb"].includes(requestIdType)) {
    return json({ ok: false, message: "نوع المعرّف غير صحيح." }, 400);
  }
  if (seasonsSplit && !/^\d+(,\d+)*$/.test(seasonsSplit)) {
    return json({ ok: false, message: "تقسيم المواسم يجب أن يكون أرقامًا مفصولة بفواصل." }, 400);
  }
  if (!requestTitle && !requestId && !oldId && !seasonsSplit) {
    return json({ ok: false, message: "أدخل بيانات الطلب أولًا." }, 400);
  }
  if (seasonsSplit && !requestId) {
    return json({ ok: false, message: "أدخل رقم المسلسل مع تقسيم المواسم." }, 400);
  }

  const inputs = {};
  if (requestTitle) inputs.request_title = requestTitle;
  if (requestId) inputs.request_id = requestId;
  if (requestType) inputs.request_type = requestType;
  if (requestIdType) inputs.request_id_type = requestIdType;
  if (oldId) inputs.old_id = oldId;
  if (seasonsSplit) inputs.seasons_split = seasonsSplit;

  const url = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`;
  const githubResponse = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
      "User-Agent": "AuroraStream-Vercel-Function",
    },
    body: JSON.stringify({ ref: BRANCH, inputs }),
  });

  const githubText = await githubResponse.text().catch(() => "");

  if (githubResponse.status === 200 || githubResponse.status === 204) {
    return json({
      ok: true,
      message: "تم إرسال الطلب بنجاح. سيبدأ التحديث عبر GitHub Actions.",
    });
  }

  console.error("GitHub workflow dispatch failed", {
    status: githubResponse.status,
    body: githubText.slice(0, 1000),
    repository: REPO,
    branch: BRANCH,
    workflow: WORKFLOW_FILE,
  });

  if (githubResponse.status === 401 || githubResponse.status === 403) {
    return json(
      { ok: false, message: "توكن الخادم غير صالح، لا يصل للمستودع، أو لا يملك صلاحية Actions: write." },
      502
    );
  }

  if (githubResponse.status === 404) {
    return json(
      {
        ok: false,
        message: `لم يتم العثور على workflow باسم ${WORKFLOW_FILE} في الفرع الافتراضي أو أن التوكن لا يصل للمستودع.`,
      },
      502
    );
  }

  if (githubResponse.status === 422) {
    return json(
      {
        ok: false,
        message: "رفض GitHub بيانات التشغيل. تحقق من اسم الفرع وملف workflow وأسماء inputs.",
      },
      502
    );
  }

  return json(
    { ok: false, message: `فشل إرسال الطلب إلى GitHub (HTTP ${githubResponse.status}).` },
    502
  );
}

async function handler(request) {
  try {
    return await processRequest(request);
  } catch (error) {
    console.error("dispatch-library unhandled error", error);
    return json(
      {
        ok: false,
        message: "حدث خطأ داخلي في Vercel Function. افتح Runtime Logs وابحث عن dispatch-library unhandled error.",
      },
      500
    );
  }
}

export default { fetch: handler };
