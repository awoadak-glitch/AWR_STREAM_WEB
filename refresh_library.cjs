// refresh_library.cjs
// تحديث كلي يومي للأعمال المضافة أصلاً بالمكتبة — يتحقق من إضافة مواسم/أجزاء جديدة
// لأعمال موجودة، ويحدّث تقييمها وكاستها. منفصل تماماً عن update_library.cjs لأن هذا
// الأخير يهتم فقط بـ "الشارتات الحية" (تتجدد تلقائياً كل ~3 ساعات أصلاً)، بينما هذا
// السكربت يلمس تحديداً الأعمال المضافة يدوياً (طلبات مستخدمين) اللي ما تُلمس أبداً
// بعد إضافتها لولا هذا السكربت.
//
// يُشغَّل مرة واحدة باليوم عبر workflow منفصل (انظر .github/workflows/refresh-library.yml).

const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

const DATA_DIR = path.join(__dirname, 'data');
const META_FILE = path.join(DATA_DIR, '_refresh_meta.json');

// أقصى عدد عناصر يُعاد جلبها بتشغيلة واحدة — يحمي من تجاوز مهلة الـ workflow (6 ساعات)
// لو صارت المكتبة ضخمة جداً مستقبلاً. الباقي يُكمَّل بالتشغيلة اليومية الجاية تلقائياً
// (المؤشر يتذكر آخر نقطة توقف عبر _refresh_meta.json).
const MAX_ITEMS_PER_RUN = parseInt(process.env.MAX_REFRESH_ITEMS || '400', 10);

// فاصل صغير بين الطلبات لتخفيف الضغط على حصة TMDB API عبر تشغيلة طويلة تلمس مئات العناصر.
const REQUEST_DELAY_MS = 120;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim();
}

function readMeta() {
    try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch (e) { return { cursor: 0 }; }
}

function writeMeta(meta) {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

function extractCast(details) {
    if (!details || !details.credits || !Array.isArray(details.credits.cast)) return [];
    return details.credits.cast
        .slice()
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .slice(0, 8)
        .map(actor => ({
            name: sanitizeText(actor.name || ""),
            role: "بطوله",
            photo_url: actor.profile_path ? `${IMG_PROFILE_BASE}${actor.profile_path}` : null
        }))
        .filter(a => a.name);
}

function filterValidSeasons(seasons) {
    if (!seasons || !Array.isArray(seasons)) return seasons;
    return seasons.filter(s => s.season_number > 0);
}

async function fetchMediaDetails(id, mediaType) {
    try {
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=ar-SA&append_to_response=translations,credits`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
        if (res.status === 404) return { __notFound: true };
    } catch (e) { console.error(`فشل جلب التفاصيل للعنصر: ${id}`); }
    return null;
}

async function fetchSeasonDetails(showId, seasonNumber) {
    try {
        const url = `${BASE_URL}/tv/${showId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=ar-SA&append_to_response=credits`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) { console.error(`فشل جلب تفاصيل الموسم ${seasonNumber} للمسلسل ${showId}`); }
    return null;
}

async function enrichSeasons(showId, seasons) {
    if (!seasons || seasons.length === 0) return seasons;
    const enriched = [];
    for (const season of seasons) {
        const details = await fetchSeasonDetails(showId, season.season_number);
        await sleep(REQUEST_DELAY_MS);
        if (details) {
            enriched.push({
                ...season,
                vote_average: typeof details.vote_average === 'number' ? details.vote_average : null,
                air_date: details.air_date || null,
                cast: extractCast(details)
            });
        } else {
            enriched.push(season);
        }
    }
    return enriched;
}

// يحدّث عنصر واحد في مكانه: يجيب تفاصيله الحالية من TMDB، ويحدّث التقييم/الكاست دايماً،
// ويحدّث المواسم فقط لو العنصر ما عليه علامة "manual_seasons_override" (تصحيح يدوي محمي).
// لا يلمس العنوان/الوصف إطلاقاً — النطاق مقصود يكون ضيق: رصد أجزاء/مواسم جديدة وتحديث
// أرقام التقييم، بدون خطر إعادة كتابة نصوص معدّلة يدوياً أو استهلاك طلبات ترجمة إضافية.
async function refreshItem(item) {
    const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
    const details = await fetchMediaDetails(item.id, mediaType);

    if (!details) {
        console.log(`⚠️ تخطي (فشل اتصال مؤقت): ${item.title || item.name || item.id}`);
        return { item, changed: false };
    }
    if (details.__notFound) {
        console.log(`⚠️ العنصر لم يعد موجوداً على TMDB (تم تجاهله بدون حذف): ${item.title || item.name || item.id}`);
        return { item, changed: false };
    }

    let changed = false;
    const updated = { ...item };

    if (typeof details.vote_average === 'number' && details.vote_average !== item.vote_average) {
        updated.vote_average = details.vote_average;
        changed = true;
    }

    if (mediaType === 'tv' && details.seasons) {
        if (item.manual_seasons_override) {
            console.log(`🔒 مواسم محمية يدوياً — تم تخطي تحديث المواسم: ${item.title || item.name}`);
        } else {
            const freshSeasons = filterValidSeasons(details.seasons);
            const oldCount = (item.seasons || []).length;
            const oldEpisodeTotal = (item.seasons || []).reduce((sum, s) => sum + (s.episode_count || 0), 0);
            const newEpisodeTotal = freshSeasons.reduce((sum, s) => sum + (s.episode_count || 0), 0);

            if (freshSeasons.length !== oldCount || newEpisodeTotal !== oldEpisodeTotal) {
                console.log(`🆕 تغيّر بعدد المواسم/الحلقات لـ [${item.title || item.name}]: ${oldCount} موسم (${oldEpisodeTotal} حلقة) ← ${freshSeasons.length} موسم (${newEpisodeTotal} حلقة). جاري تحديث تفاصيل كل موسم...`);
                updated.seasons = await enrichSeasons(item.id, freshSeasons);
                changed = true;
            }
        }
    }

    const freshCast = extractCast(details);
    if (freshCast.length > 0) {
        const oldCastNames = (item.cast || []).map(c => c.name).join(',');
        const newCastNames = freshCast.map(c => c.name).join(',');
        if (oldCastNames !== newCastNames) {
            updated.cast = freshCast;
            changed = true;
        }
    }

    if (changed) {
        console.log(`✅ تم تحديث: ${item.title || item.name}`);
    }
    return { item: updated, changed };
}

async function refreshLibrary() {
    if (!TMDB_API_KEY) { console.error("Missing TMDB_API_KEY"); process.exit(1); }
    if (!fs.existsSync(DATA_DIR)) { console.log("لا يوجد مجلد بيانات بعد."); return; }

    // نستثني ملفات الشارت الحي (_chart_) لأنها أصلاً تُعاد كتابتها بالكامل بشكل متكرر
    // من update_library.cjs، فإعادة فحصها هنا تكرار غير مفيد. نستثني كذلك ملفات النظام.
    const allFiles = fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json'))
        .filter(f => f !== 'index.json' && f !== '_scrape_meta.json' && f !== '_refresh_meta.json')
        .filter(f => !f.includes('_chart_'))
        .sort();

    if (allFiles.length === 0) {
        console.log("لا يوجد ملفات مضافة يدوياً تحتاج تحديث دوري.");
        return;
    }

    // نبني قائمة مسطحة من (اسم الملف، فهرس العنصر داخله) عشان نقدر نكمل من نفس النقطة
    // بالتشغيلة الجاية لو تجاوزنا MAX_ITEMS_PER_RUN بهذي التشغيلة.
    const fileContents = {};
    const flatIndex = [];
    for (const file of allFiles) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
            if (!Array.isArray(data)) continue;
            fileContents[file] = data;
            data.forEach((_, idx) => flatIndex.push({ file, idx }));
        } catch (e) {
            console.error(`⚠️ تعذّرت قراءة الملف: ${file}`);
        }
    }

    if (flatIndex.length === 0) {
        console.log("لا يوجد عناصر صالحة للتحديث.");
        return;
    }

    const meta = readMeta();
    let cursor = meta.cursor || 0;
    if (cursor >= flatIndex.length) cursor = 0; // أكملنا دورة كاملة، نبدأ من جديد

    const batchEnd = Math.min(cursor + MAX_ITEMS_PER_RUN, flatIndex.length);
    const batch = flatIndex.slice(cursor, batchEnd);

    console.log(`📋 إجمالي العناصر المضافة يدوياً: ${flatIndex.length}`);
    console.log(`🔄 هذي التشغيلة تغطي العناصر من ${cursor} إلى ${batchEnd} (${batch.length} عنصر)...`);

    const touchedFiles = new Set();

    for (const { file, idx } of batch) {
        const item = fileContents[file][idx];
        const result = await refreshItem(item);
        if (result.changed) {
            fileContents[file][idx] = result.item;
            touchedFiles.add(file);
        }
        await sleep(REQUEST_DELAY_MS);
    }

    for (const file of touchedFiles) {
        fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(fileContents[file], null, 2));
        console.log(`📁 تم حفظ التحديثات بالملف: ${file}`);
    }

    const nextCursor = batchEnd >= flatIndex.length ? 0 : batchEnd;
    writeMeta({ cursor: nextCursor, lastRunAt: Date.now(), totalItems: flatIndex.length });

    if (touchedFiles.size === 0) {
        console.log("✅ اكتمل الفحص — لا توجد تغييرات بهذي الدفعة.");
    } else {
        console.log(`🎉 اكتمل التحديث الكلي لهذي الدفعة. تم تعديل ${touchedFiles.size} ملف.`);
    }

    if (nextCursor === 0 && batchEnd >= flatIndex.length) {
        console.log("🏁 أُكملت دورة فحص كاملة لكل المكتبة. الدورة الجاية تبدأ من البداية.");
    } else {
        console.log(`⏭️ الدفعة الجاية تبدأ من العنصر رقم ${nextCursor}.`);
    }
}

refreshLibrary();
