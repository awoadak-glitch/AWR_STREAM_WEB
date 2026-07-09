// update_library.js
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 🛡️ دالة الحماية: تقوم بتنظيف النصوص من جميع الإشارات وإبقاء الكلمات فقط
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    // إزالة أي رموز أو علامات ترقيم، والإبقاء فقط على الأحرف (العربية والإنجليزية) والأرقام والمسافات
    return text.replace(/[^\w\s\u0600-\u06FF]/g, " ").replace(/\s+/g, " ").trim();
}

// 🌍 دالة حقن الترجمات: تضيف الأسماء والوصف باللغات (العربية، الإنجليزية، اليابانية)
function injectTranslations(item, details) {
    if (!details || !details.translations || !details.translations.translations) return;
    
    const ar = details.translations.translations.find(t => t.iso_639_1 === 'ar');
    const en = details.translations.translations.find(t => t.iso_639_1 === 'en');
    const ja = details.translations.translations.find(t => t.iso_639_1 === 'ja');

    if (ar) {
        item.title_ar = sanitizeText(ar.data.title || ar.data.name || "");
        item.overview_ar = sanitizeText(ar.data.overview || "");
    }
    if (en) {
        item.title_en = sanitizeText(en.data.title || en.data.name || "");
        item.overview_en = sanitizeText(en.data.overview || "");
    }
    if (ja) {
        item.title_ja = sanitizeText(ja.data.title || ja.data.name || "");
        item.overview_ja = sanitizeText(ja.data.overview || "");
    }
}

// ✂️ دالة فلترة المواسم: تبقي المواسم الحقيقية كما هي وتحذف "الموسم 0" (الحلقات الخاصة) لتجنب أخطاء المشغل
function filterValidSeasons(seasons) {
    if (!seasons || !Array.isArray(seasons)) return seasons;
    
    // إرجاع المواسم الحقيقية بأرقامها الأصلية بدون أي دمج أو تقسيم افتراضي
    return seasons.filter(s => s.season_number > 0);
}

async function fetchTvDetails(tvId) {
    try {
        const url = `${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {
        console.error(`فشل جلب تفاصيل المسلسل: ${tvId}`);
    }
    return null;
}

async function fetchMediaDetails(id, mediaType) {
    try {
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {
        console.error(`فشل جلب التفاصيل الكاملة للعنصر: ${id}`);
    }
    return null;
}

async function fetchStrict100Items(endpoint, mediaType, extraParams = '') {
    let categoryResults = [];
    let seenIds = new Set();
    let page = 1;

    console.log(`=== بدأ سحب 100 عنصر لقسم: [${mediaType}] ===`);

    while (categoryResults.length < 100 && page <= 20) {
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=en-US&page=${page}${extraParams}`;
            
            const res = await fetch(url);
            if (!res.ok) break;
            
            const data = await res.json();
            if (!data.results || data.results.length === 0) break;

            for (const item of data.results) {
                if (categoryResults.length >= 100) break; 

                if (item.poster_path && !seenIds.has(item.id)) {
                    seenIds.add(item.id);

                    const isTvShow = mediaType === 'tv' || item.media_type === 'tv' || (!item.title && item.name);
                    item.media_type = isTvShow ? 'tv' : 'movie'; 

                    if (isTvShow) {
                        const tvDetails = await fetchTvDetails(item.id);
                        if (tvDetails && tvDetails.seasons) {
                            // جلب المواسم الحقيقية فقط
                            item.seasons = filterValidSeasons(tvDetails.seasons);
                        }
                        injectTranslations(item, tvDetails);
                    }

                    // 🛡️ تطبيق الحماية على النصوص قبل حفظها
                    item.overview = sanitizeText(item.overview);
                    item.title = sanitizeText(item.title);
                    item.name = sanitizeText(item.name);
                    if (item.original_title) item.original_title = sanitizeText(item.original_title);

                    categoryResults.push(item);
                }
            }
            console.log(`التقدم في قسم [${mediaType}]: تم جمع ${categoryResults.length} / 100`);
            page++;
        } catch (error) {
            console.error(`خطأ أثناء السحب:`, error);
            break;
        }
    }
    return categoryResults;
}

async function handleDirectRequest(libraryData, queryTitle) {
    if (!queryTitle) return libraryData;
    
    console.log(`🚀 جاري البحث عن العنوان: "${queryTitle}" ...`);
    try {
        const searchUrl = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(queryTitle)}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
            // استبعاد الأشخاص، وفرز النتائج حسب الشهرة، وجلب أفضل 3 نتائج مشابهة
            let relevantResults = searchData.results
                .filter(r => r.media_type !== 'person')
                .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                .slice(0, 3); 

            if (relevantResults.length === 0) {
                console.log(`❌ لم يتم العثور على أفلام أو مسلسلات مطابقة.`);
                return libraryData;
            }

            for (let rawItem of relevantResults) {
                const mediaType = rawItem.media_type || ((rawItem.title) ? 'movie' : 'tv');
                const item = await fetchMediaDetails(rawItem.id, mediaType);
                
                if (item && item.poster_path) {
                    const isTv = mediaType === 'tv';
                    item.media_type = mediaType; 

                    injectTranslations(item, item);

                    if (isTv) {
                        const tvDetails = await fetchTvDetails(item.id);
                        if (tvDetails && tvDetails.seasons) {
                            // جلب المواسم الحقيقية فقط
                            item.seasons = filterValidSeasons(tvDetails.seasons);
                        }
                    }

                    item.overview = sanitizeText(item.overview);
                    item.title = sanitizeText(item.title);
                    item.name = sanitizeText(item.name);
                    if (item.original_title) item.original_title = sanitizeText(item.original_title);

                    let targetCategory = 'trending';
                    if (isTv) {
                        if (item.original_language === 'ko') targetCategory = 'kdrama';
                        else if (item.genres && item.genres.some(g => g.id === 16) && item.original_language === 'ja') targetCategory = 'anime';
                        else targetCategory = 'series';
                    } else {
                        targetCategory = 'movies';
                    }

                    const exists = libraryData[targetCategory].some(existing => existing.id === item.id);
                    if (!exists) {
                        libraryData[targetCategory].unshift(item);
                        libraryData.trending.unshift(item);
                        console.log(`✅ تم الحفظ بنجاح: [${item.title || item.name}]`);
                    } else {
                        console.log(`⚠️ العنصر موجود مسبقاً: [${item.title || item.name}]`);
                    }
                }
            }
        } else {
            console.log(`❌ لم يتم العثور على نتائج للعنوان: "${queryTitle}"`);
        }
    } catch (e) {
        console.error('خطأ:', e);
    }
    return libraryData;
}

async function runScraper() {
    if (!TMDB_API_KEY) {
        process.exit(1);
    }

    let currentLibrary = { trending: [], movies: [], series: [], kdrama: [], anime: [] };

    if (REQUEST_TITLE && REQUEST_TITLE.trim() !== '') {
        if (fs.existsSync('library.json')) {
            try { currentLibrary = JSON.parse(fs.readFileSync('library.json', 'utf8')); } catch (e) {}
        }
        currentLibrary = await handleDirectRequest(currentLibrary, REQUEST_TITLE.trim());
    } else {
        currentLibrary.trending = await fetchStrict100Items('/trending/all/day', 'mixed');
        currentLibrary.movies = await fetchStrict100Items('/discover/movie', 'movie');
        currentLibrary.series = await fetchStrict100Items('/discover/tv', 'tv');
        currentLibrary.kdrama = await fetchStrict100Items('/discover/tv', 'tv', '&with_original_language=ko&with_origin_country=KR');
        currentLibrary.anime = await fetchStrict100Items('/discover/tv', 'tv', '&with_genres=16&with_original_language=ja');
    }

    fs.writeFileSync('library.json', JSON.stringify(currentLibrary, null, 2));
    console.log('🎉 اكتملت العملية بتنظيف البيانات بنجاح!');
}

runScraper();
