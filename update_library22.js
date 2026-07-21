// update_library.js
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE;
const REQUEST_ID = process.env.REQUEST_ID;
const REQUEST_TYPE = process.env.REQUEST_TYPE;
const REQUEST_ID_TYPE = process.env.REQUEST_ID_TYPE || 'tmdb';
const OLD_ID = process.env.OLD_ID;
const SEASONS_SPLIT = process.env.SEASONS_SPLIT;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

// تجهيز مجلد البيانات
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// عدد الساعات الدنيا بين تحديث كامل (شارتات حية + مكتبة) وآخر — قابل للتعديل عبر متغير بيئة
// LIVE_REFRESH_HOURS بالـ workflow. هذا يمنع استهلاك حصة TMDB وإرباك السجل بتشغيل السكربت
// كل 30 دقيقة بدل كل عدة ساعات، بغض النظر عن جدولة الـ cron نفسها.
const LIVE_REFRESH_HOURS = parseFloat(process.env.LIVE_REFRESH_HOURS || '3');
const META_FILE = path.join(DATA_DIR, '_scrape_meta.json');

function readMeta() {
    try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch (e) { return {}; }
}

function writeMeta(meta) {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}

function hoursSince(ts) {
    if (!ts) return Infinity;
    return (Date.now() - ts) / (1000 * 60 * 60);
}

// كل الأقسام (الرائج/الأحدث/أفلام/مسلسلات/كوريه/أنمي) صارت "شارتات حية" تُستبدل بالكامل
// كل تحديث دوري — بترتيب حقيقي حسب الرواج داخل كل تصنيف، تماماً متل HITV. أي إضافة
// يدوية (طلب مستخدم) تبقى منفصلة تماماً ومحفوظة للأبد (انظر _chart_ بالأسماء أدناه).

function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim();
}

function injectDualLanguages(item, details) {
    if (!details) return;

    item.title = sanitizeText(details.title || details.name || item.title || item.name || "");
    item.overview = sanitizeText(details.overview || item.overview || "");

    if (details.translations && details.translations.translations) {
        const enTrans = details.translations.translations.find(t => t.iso_639_1 === 'en');
        if (enTrans && enTrans.data) {
            item.title_en = sanitizeText(enTrans.data.title || enTrans.data.name || "");
            item.overview_en = sanitizeText(enTrans.data.overview || "");
        }
    }

    if (!item.title_en) item.title_en = item.title;
    if (!item.overview_en) item.overview_en = item.overview;
}

// استخراج طاقم التمثيل من TMDB credits وتحويله لشكل CastMember اللي يتوقعه التطبيق
// ({ name, role, photo_url }) — أعلى 8 أسماء حسب ترتيب الأهمية (order) اللي يرجعه TMDB.
function extractCast(details) {
    if (!details || !details.credits || !Array.isArray(details.credits.cast)) return [];
    return details.credits.cast
        .slice() // نسخة قبل الفرز
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .slice(0, 8)
        .map(actor => ({
            name: sanitizeText(actor.name || ""),
            role: "بطوله",
            photo_url: actor.profile_path ? `${IMG_PROFILE_BASE}${actor.profile_path}` : null
        }))
        .filter(a => a.name);
}

function applyManualSeasonsSplit(item) {
    if (!SEASONS_SPLIT || item.media_type !== 'tv') return;

    console.log(`⚙️ جاري تطبيق التقسيم اليدوي للمواسم للمسلسل: [${SEASONS_SPLIT}]`);
    const episodeCounts = SEASONS_SPLIT.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num) && num > 0);

    if (episodeCounts.length > 0) {
        item.seasons = episodeCounts.map((count, index) => {
            return {
                season_number: index + 1,
                episode_count: count,
                name: `الموسم ${index + 1}`
            };
        });
        console.log(`✅ تم تقسيم المسلسل بنجاح إلى ${episodeCounts.length} مواسم يدوياً.`);
    }
}

function filterValidSeasons(seasons) {
    if (!seasons || !Array.isArray(seasons)) return seasons;
    return seasons.filter(s => s.season_number > 0);
}

// قراءة جميع الملفات في مجلد data لجلب الأيديات القديمة ومنع التكرار
// ملاحظة: ملفات "الشارت الحي" (تحمل _chart_ باسمها) مستثناة من هذا الفحص عمداً —
// نفس العنصر يجوز يظهر بالرائج اليوم وبقسم تصنيفه كمان، هذا طبيعي وليس تكراراً خاطئاً.
// أما الملفات المُضافة يدوياً (عبر طلب مستخدم) فتبقى ضمن فحص التكرار دايماً بغض النظر
// عن تصنيفها، عشان ما يتكرر نفس العنصر لو طُلب أكثر من مرة.
function getGlobalSeenIds() {
    let ids = new Set();
    const files = fs.readdirSync(DATA_DIR);
    for (let file of files) {
        if (file.endsWith('.json') && file !== 'index.json' && file !== '_scrape_meta.json') {
            if (file.includes('_chart_')) continue;
            try {
                const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
                if (Array.isArray(data)) {
                    data.forEach(item => ids.add(item.id));
                }
            } catch (e) {}
        }
    }
    return ids;
}

// البحث عن العنصر المعطوب وحذفه من أي ملف كان يتواجد فيه
function removeDefectiveItem(oldId) {
    const oldIdNumber = Number(oldId);
    console.log(`⚠️ وضع الإصلاح: البحث عن العنصر المعطوب (ID: ${oldIdNumber}) في كافة الملفات...`);
    const files = fs.readdirSync(DATA_DIR);
    for (let file of files) {
        if (file.endsWith('.json') && file !== 'index.json') {
            const filePath = path.join(DATA_DIR, file);
            try {
                let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (Array.isArray(data)) {
                    const originalLength = data.length;
                    data = data.filter(item => item.id !== oldIdNumber);
                    if (data.length < originalLength) {
                        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                        console.log(`🗑️ تم حذف العنصر من الملف: ${file}`);
                    }
                }
            } catch (e) {}
        }
    }
}

// يحذف كل الملفات القديمة العائدة لشارت حي معين (مثلاً كل anime_chart_*.json) قبل ما
// نكتب النسخة الجديدة — هذا هو المفتاح لمنع تراكم ملفات قديمة وميتة. لاحظ الاسم يحمل
// "_chart_" تحديداً، عشان ما يلمس أي ملف أُضيف يدوياً لنفس التصنيف (زي anime_169999.json
// اللي جا من طلب مستخدم) — تلك تبقى محفوظة للأبد ولا تُحذف أبداً.
function replaceLiveChartFiles(category, items, timestamp) {
    const files = fs.readdirSync(DATA_DIR);
    let removedCount = 0;
    const prefix = `${category}_chart_`;
    for (let file of files) {
        if (file.startsWith(prefix) && file.endsWith('.json')) {
            fs.unlinkSync(path.join(DATA_DIR, file));
            removedCount++;
        }
    }
    if (removedCount > 0) {
        console.log(`🧹 تم حذف ${removedCount} ملف قديم من شارت [${category}] قبل التحديث.`);
    }
    if (items.length > 0) {
        const fileName = `${prefix}${timestamp}.json`;
        fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(items, null, 2));
        console.log(`📁 تم إنشاء ملف الشارت الحي: ${fileName} (${items.length} عنصر)`);
        return true;
    }
    return false;
}

async function fetchTmdbIdFromImdb(imdbId) {
    try {
        console.log(`🔎 جاري تحويل IMDb ID (${imdbId}) إلى TMDB ID...`);
        const url = `${BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.movie_results && data.movie_results.length > 0) return { id: data.movie_results[0].id, type: 'movie' };
        if (data.tv_results && data.tv_results.length > 0) return { id: data.tv_results[0].id, type: 'tv' };
    } catch (e) { console.error('❌ خطأ أثناء الاتصال بخدمة التحويل من IMDb'); }
    return null;
}

async function fetchMediaDetails(id, mediaType) {
    try {
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=ar-SA&append_to_response=translations,credits`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) { console.error(`فشل جلب التفاصيل للعنصر: ${id}`); }
    return null;
}

// دالة جديدة لجلب جميع أجزاء السلسلة (Collection)
async function fetchCollectionParts(collectionId) {
    try {
        const url = `${BASE_URL}/collection/${collectionId}?api_key=${TMDB_API_KEY}&language=ar-SA`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) { console.error(`❌ فشل جلب تفاصيل السلسلة: ${collectionId}`); }
    return null;
}

async function saveMediaItem(currentRunData, globalSeenIds, item, mediaType) {
    if (globalSeenIds.has(item.id)) {
        console.log(`⚠️ العنصر موجود مسبقاً (تم تخطيه): ${item.title || item.name || item.id}`);
        return;
    }

    const isTv = mediaType === 'tv';
    item.media_type = mediaType;

    const details = await fetchMediaDetails(item.id, mediaType);
    if (details) {
        if (!isTv) {
            item = Object.assign({}, details, item);
        } else if (details.seasons) {
            item.seasons = filterValidSeasons(details.seasons);
        }
        injectDualLanguages(item, details);
        item.cast = extractCast(details);
    } else {
        item.overview = sanitizeText(item.overview);
        item.title = sanitizeText(item.title || item.name);
        item.title_en = item.title;
        item.overview_en = item.overview;
    }

    if (item.original_title) item.original_title = sanitizeText(item.original_title);
    applyManualSeasonsSplit(item);
    item.date_added = Date.now();

    let targetCategory = 'trending';
    if (isTv) {
        if (item.original_language === 'ko') targetCategory = 'kdrama';
        else if (item.genres && item.genres.some(g => g.id === 16) && item.original_language === 'ja') targetCategory = 'anime';
        else targetCategory = 'series';
    } else {
        targetCategory = 'movies';
    }

    currentRunData[targetCategory].push(item);
    globalSeenIds.add(item.id);
    console.log(`✅ تم تجهيز الحفظ: [${item.title || item.name}]`);
}

async function fetchStrict100Items(endpoint, mediaType, globalSeenIds, extraParams = '') {
    let categoryResults = [];
    let page = 1;
    console.log(`=== سحب قسم: [${mediaType}] ===`);

    while (categoryResults.length < 100 && page <= 25) {
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ar-SA&page=${page}${extraParams}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!data.results || data.results.length === 0) break;

            for (let item of data.results) {
                if (categoryResults.length >= 100) break;

                if (item.poster_path && !globalSeenIds.has(item.id)) {
                    globalSeenIds.add(item.id);

                    const isTvShow = mediaType === 'tv' || item.media_type === 'tv' || (!item.title && item.name);
                    const actualType = isTvShow ? 'tv' : 'movie';
                    item.media_type = actualType;

                    const fullDetails = await fetchMediaDetails(item.id, actualType);
                    if (fullDetails) {
                        if (!isTvShow) {
                            item = Object.assign({}, fullDetails, item);
                        } else if (fullDetails.seasons) {
                            item.seasons = filterValidSeasons(fullDetails.seasons);
                        }
                        injectDualLanguages(item, fullDetails);
                        item.cast = extractCast(fullDetails);
                    } else {
                        item.overview = sanitizeText(item.overview);
                        item.title = sanitizeText(item.title || item.name);
                        item.title_en = item.title;
                        item.overview_en = item.overview;
                    }
                    if (item.original_title) item.original_title = sanitizeText(item.original_title);
                    item.date_added = Date.now();

                    categoryResults.push(item);
                }
            }
            page++;
        } catch (error) { break; }
    }
    return categoryResults;
}

// جلب فئة "شارت حي" — بدون فحص globalSeenIds وبدون منع التكرار عبر التشغيلات،
// لأن هذي الفئة تُستبدل بالكامل كل مرة (انظر replaceLiveChartFiles). تُستخدم لـ trending/latest.
async function fetchLiveChart(endpoint, mediaType, extraParams = '', limit = 60) {
    let results = [];
    let page = 1;
    const seenThisRun = new Set();
    console.log(`=== تحديث شارت حي: [${endpoint}] ===`);

    while (results.length < limit && page <= 10) {
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ar-SA&page=${page}${extraParams}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!data.results || data.results.length === 0) break;

            for (let item of data.results) {
                if (results.length >= limit) break;
                if (item.media_type === 'person') continue;
                if (!item.poster_path) continue;
                if (seenThisRun.has(item.id)) continue;
                seenThisRun.add(item.id);

                const isTvShow = mediaType === 'tv' || item.media_type === 'tv' || (!item.title && item.name);
                const actualType = isTvShow ? 'tv' : 'movie';
                item.media_type = actualType;

                const fullDetails = await fetchMediaDetails(item.id, actualType);
                if (fullDetails) {
                    if (!isTvShow) {
                        item = Object.assign({}, fullDetails, item);
                    } else if (fullDetails.seasons) {
                        item.seasons = filterValidSeasons(fullDetails.seasons);
                    }
                    injectDualLanguages(item, fullDetails);
                    item.cast = extractCast(fullDetails);
                } else {
                    item.overview = sanitizeText(item.overview);
                    item.title = sanitizeText(item.title || item.name);
                    item.title_en = item.title;
                    item.overview_en = item.overview;
                }
                if (item.original_title) item.original_title = sanitizeText(item.original_title);
                item.date_added = Date.now();

                results.push(item);
            }
            page++;
        } catch (error) { break; }
    }
    return results;
}

// دالة معالجة الريكوست المباشر عبر الـ ID مع دعم السلاسل (Collections)
async function handleDirectIdRequest(currentRunData, globalSeenIds, id, type) {
    let typesToTry = type ? [type.trim()] : ['movie', 'tv'];
    let item = null, finalMediaType = 'movie';

    for (let t of typesToTry) {
        const details = await fetchMediaDetails(id, t);
        if (details && details.poster_path) {
            item = details;
            finalMediaType = t;
            break;
        }
    }

    if (item) {
        if (finalMediaType === 'movie' && item.belongs_to_collection) {
            console.log(`🔗 الفيلم ينتمي إلى سلسلة: [${item.belongs_to_collection.name}]. جاري سحب جميع الأجزاء...`);
            const collectionData = await fetchCollectionParts(item.belongs_to_collection.id);

            if (collectionData && collectionData.parts) {
                const parts = collectionData.parts.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
                for (let part of parts) {
                    await saveMediaItem(currentRunData, globalSeenIds, { id: part.id }, 'movie');
                }
            }
        } else {
            await saveMediaItem(currentRunData, globalSeenIds, item, finalMediaType);
        }
    } else {
        console.log(`❌ لم يتم العثور على أي تفاصيل للمعرف: ${id}`);
    }
}

// دالة معالجة الريكوست عبر الاسم مع دعم السلاسل (Collections)
async function handleDirectRequest(currentRunData, globalSeenIds, queryTitle) {
    if (!queryTitle) return;
    try {
        const searchUrl = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=ar-SA&query=${encodeURIComponent(queryTitle)}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
            let relevantResults = searchData.results
                .filter(r => r.media_type !== 'person')
                .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                .slice(0, 3);

            for (let rawItem of relevantResults) {
                const mediaType = rawItem.media_type || ((rawItem.title) ? 'movie' : 'tv');
                const item = await fetchMediaDetails(rawItem.id, mediaType);

                if (item && item.poster_path) {
                    if (mediaType === 'movie' && item.belongs_to_collection) {
                        console.log(`🔗 الفيلم ينتمي إلى سلسلة: [${item.belongs_to_collection.name}]. جاري سحب جميع الأجزاء...`);
                        const collectionData = await fetchCollectionParts(item.belongs_to_collection.id);
                        if (collectionData && collectionData.parts) {
                            const parts = collectionData.parts.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
                            for (let part of parts) {
                                await saveMediaItem(currentRunData, globalSeenIds, { id: part.id }, 'movie');
                            }
                        }
                    } else {
                        await saveMediaItem(currentRunData, globalSeenIds, item, mediaType);
                    }
                }
            }
        }
    } catch (e) { }
}

async function runScraper() {
    if (!TMDB_API_KEY) { console.error("Missing TMDB_API_KEY"); process.exit(1); }

    if (OLD_ID) {
        removeDefectiveItem(OLD_ID);
    }

    let currentRunData = { trending: [], movies: [], series: [], kdrama: [], anime: [] };
    let globalSeenIds = getGlobalSeenIds();
    const timestamp = Date.now();
    let generatedFiles = false;

    const isIdNumeric = REQUEST_TITLE && /^\d+$/.test(REQUEST_TITLE.trim());
    const targetIdRaw = REQUEST_ID ? REQUEST_ID.trim() : (isIdNumeric ? REQUEST_TITLE.trim() : null);

    if (targetIdRaw) {
        let finalId = targetIdRaw;
        let finalType = REQUEST_TYPE;

        if (REQUEST_ID_TYPE === 'imdb') {
            const tmdbData = await fetchTmdbIdFromImdb(targetIdRaw);
            if (tmdbData) {
                finalId = tmdbData.id;
                if (!finalType) finalType = tmdbData.type;
                console.log(`✅ تم تحويل المعرف بنجاح إلى TMDB ID: ${finalId} من نوع ${finalType}`);
            } else {
                console.log(`❌ لم يتم العثور على أي عنصر يطابق معرف IMDb: ${targetIdRaw}`);
                finalId = null;
            }
        }
        if (finalId) await handleDirectIdRequest(currentRunData, globalSeenIds, finalId, finalType);

    } else if (REQUEST_TITLE && REQUEST_TITLE.trim() !== '') {
        await handleDirectRequest(currentRunData, globalSeenIds, REQUEST_TITLE.trim());

    } else if (!OLD_ID) {
        const meta = readMeta();
        const elapsedHours = hoursSince(meta.lastFullRun);

        if (elapsedHours < LIVE_REFRESH_HOURS) {
            const remaining = (LIVE_REFRESH_HOURS - elapsedHours).toFixed(1);
            console.log(`⏭️ تم تخطي التحديث الكامل — آخر تحديث كان قبل ${elapsedHours.toFixed(1)} ساعة فقط.`);
            console.log(`⏭️ الحد الأدنى بين التحديثات هو ${LIVE_REFRESH_HOURS} ساعة (باقي ~${remaining} ساعة). لا شيء تغيّر بهذا التشغيل.`);
        } else {
            // === كل الأقسام صارت شارتات حية — تُستبدل بالكامل كل تحديث دوري، بترتيب
            // حقيقي حسب الرواج داخل كل تصنيف (مو تراكم صفحات عشوائية عبر الوقت) ===
            console.log("📈 جاري تحديث [الرائج] كشارت حي (استبدال كامل)...");
            const freshTrending = await fetchLiveChart('/trending/all/week', 'mixed', '', 60);
            if (replaceLiveChartFiles('trending', freshTrending, timestamp)) generatedFiles = true;

            console.log("🆕 جاري تحديث [الأحدث] كشارت حي (استبدال كامل)...");
            const nowPlayingMovies = await fetchLiveChart('/movie/now_playing', 'movie', '', 30);
            const onTheAirTv = await fetchLiveChart('/tv/on_the_air', 'tv', '', 30);
            if (replaceLiveChartFiles('latest', [...nowPlayingMovies, ...onTheAirTv], timestamp)) generatedFiles = true;

            console.log("🎬 جاري تحديث [الأفلام] كشارت حي — ترند حقيقي حسب الرواج...");
            const freshMovies = await fetchLiveChart('/discover/movie', 'movie', '&sort_by=popularity.desc', 60);
            if (replaceLiveChartFiles('movies', freshMovies, timestamp)) generatedFiles = true;

            console.log("📺 جاري تحديث [المسلسلات] كشارت حي — ترند حقيقي حسب الرواج...");
            const freshSeries = await fetchLiveChart('/discover/tv', 'tv', '&sort_by=popularity.desc', 60);
            if (replaceLiveChartFiles('series', freshSeries, timestamp)) generatedFiles = true;

            console.log("🇰🇷 جاري تحديث [الدراما الكورية] كشارت حي — ترند حقيقي حسب الرواج...");
            const freshKdrama = await fetchLiveChart('/discover/tv', 'tv', '&sort_by=popularity.desc&with_original_language=ko&with_origin_country=KR', 60);
            if (replaceLiveChartFiles('kdrama', freshKdrama, timestamp)) generatedFiles = true;

            console.log("🎌 جاري تحديث [الأنمي] كشارت حي — ترند حقيقي حسب الرواج...");
            const freshAnime = await fetchLiveChart('/discover/tv', 'tv', '&sort_by=popularity.desc&with_genres=16&with_original_language=ja', 60);
            if (replaceLiveChartFiles('anime', freshAnime, timestamp)) generatedFiles = true;

            writeMeta({ ...meta, lastFullRun: Date.now() });
            console.log(`✅ اكتمل التحديث الكامل. التحديث القادم مسموح بعد ${LIVE_REFRESH_HOURS} ساعة على الأقل.`);
        }
    }

    // كتابة ملفات المكتبة التراكمية (movies/series/kdrama/anime + طلبات مباشرة/إصلاح)
    for (const [category, items] of Object.entries(currentRunData)) {
        if (items.length > 0) {
            const fileName = `${category}_${timestamp}.json`;
            fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(items, null, 2));
            console.log(`📁 تم إنشاء ملف جديد: ${fileName} (يحتوي على ${items.length} عنصر)`);
            generatedFiles = true;
        }
    }

    if (generatedFiles || OLD_ID) {
        const allFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'index.json' && f !== '_scrape_meta.json');
        fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(allFiles, null, 2));
        console.log(`📋 تم تحديث فهرس الملفات (index.json) بنجاح! الإجمالي: ${allFiles.length} ملف`);
    }

    console.log('🎉 اكتملت العملية بنجاح!');
}

runScraper();
