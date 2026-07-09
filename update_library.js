// update_library.js
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE; 
const REQUEST_ID = process.env.REQUEST_ID; 
const REQUEST_TYPE = process.env.REQUEST_TYPE; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 🛡️ دالة الحماية المحدثة: تنظف النصوص من جميع الإشارات والرموز
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim();
}

// 🌍 دالة حقن الترجمات: تم تعديلها لتسحب فقط اللغة الإنجليزية (English Only)
function injectTranslations(item, details) {
    if (!details) return;
    
    // سحب البيانات باللغة الإنجليزية فقط لضمان استقرار ملف الـ JSON
    item.title_en = sanitizeText(details.title || details.name || "");
    item.overview_en = sanitizeText(details.overview || "");
}

// ✂️ دالة فلترة المواسم
function filterValidSeasons(seasons) {
    if (!seasons || !Array.isArray(seasons)) return seasons;
    return seasons.filter(s => s.season_number > 0);
}

async function fetchTvDetails(tvId) {
    try {
        // إضافة language=en-US لضمان جلب بيانات إنجليزية فقط
        const url = `${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {
        console.error(`فشل جلب تفاصيل المسلسل: ${tvId}`);
    }
    return null;
}

async function fetchMediaDetails(id, mediaType) {
    try {
        // إضافة language=en-US لضمان جلب بيانات إنجليزية فقط
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {
        console.error(`فشل جلب التفاصيل الكاملة للعنصر: ${id}`);
    }
    return null;
}

async function saveMediaItem(libraryData, item, mediaType) {
    const isTv = mediaType === 'tv';
    item.media_type = mediaType;

    injectTranslations(item, item);

    if (isTv) {
        const tvDetails = await fetchTvDetails(item.id);
        if (tvDetails) {
            if (tvDetails.seasons) {
                item.seasons = filterValidSeasons(tvDetails.seasons);
            }
            injectTranslations(item, tvDetails);
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
        if (!libraryData.trending.some(existing => existing.id === item.id)) {
            libraryData.trending.unshift(item);
        }
        console.log(`✅ تم الحفظ بنجاح: [${item.title || item.name}]`);
    } else {
        console.log(`⚠️ العنصر موجود مسبقاً في قسم [${targetCategory}]: [${item.title || item.name}]`);
    }
}

async function fetchStrict100Items(endpoint, mediaType, extraParams = '') {
    let categoryResults = [];
    let seenIds = new Set();
    let page = 1;

    console.log(`=== بدأ سحب 100 عنصر لقسم: [${mediaType}] ===`);

    while (categoryResults.length < 100 && page <= 20) {
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            // فرض اللغة الإنجليزية دائماً
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
                            item.seasons = filterValidSeasons(tvDetails.seasons);
                        }
                        injectTranslations(item, tvDetails);
                    }

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

async function handleDirectIdRequest(libraryData, id, type) {
    console.log(`🚀 جاري الفحص وجلب العنصر مباشرة باستخدام المعرف ID: ${id} ...`);
    let typesToTry = type ? [type.trim()] : ['movie', 'tv'];
    let item = null;
    let finalMediaType = 'movie';

    for (let t of typesToTry) {
        const details = await fetchMediaDetails(id, t);
        if (details && details.poster_path) {
            item = details;
            finalMediaType = t;
            break;
        }
    }

    if (item) {
        await saveMediaItem(libraryData, item, finalMediaType);
    } else {
        console.log(`❌ لم يتم العثور على أي فيلم أو مسلسل يحمل المعرف ID: ${id}`);
    }
    return libraryData;
}

async function handleDirectRequest(libraryData, queryTitle) {
    if (!queryTitle) return libraryData;
    
    console.log(`🚀 جاري البحث الشامل عن العنوان: "${queryTitle}" ...`);
    try {
        // فرض اللغة الإنجليزية في البحث
        const searchUrl = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(queryTitle)}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
            let relevantResults = searchData.results
                .filter(r => r.media_type !== 'person')
                .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                .slice(0, 3); 

            if (relevantResults.length === 0) {
                console.log(`❌ لم يتم العثور على نتائج مطابقة للعناوين.`);
                return libraryData;
            }

            for (let rawItem of relevantResults) {
                const mediaType = rawItem.media_type || ((rawItem.title) ? 'movie' : 'tv');
                const item = await fetchMediaDetails(rawItem.id, mediaType);
                
                if (item && item.poster_path) {
                    await saveMediaItem(libraryData, item, mediaType);
                }
            }
        } else {
            console.log(`❌ لا توجد نتائج مطابقة في TMDB للعنوان: "${queryTitle}"`);
        }
    } catch (e) {
        console.error('خطأ أثناء معالجة الطلب النصي:', e);
    }
    return libraryData;
}

async function runScraper() {
    if (!TMDB_API_KEY) {
        console.error("خطأ: مفتاح TMDB_API_KEY غير متوفر في متغيرات البيئة.");
        process.exit(1);
    }

    let currentLibrary = { trending: [], movies: [], series: [], kdrama: [], anime: [] };

    if (fs.existsSync('library.json')) {
        try { currentLibrary = JSON.parse(fs.readFileSync('library.json', 'utf8')); } catch (e) {}
    }

    const isIdNumeric = REQUEST_TITLE && /^\d+$/.test(REQUEST_TITLE.trim());
    const targetId = REQUEST_ID ? REQUEST_ID.trim() : (isIdNumeric ? REQUEST_TITLE.trim() : null);

    if (targetId) {
        currentLibrary = await handleDirectIdRequest(currentLibrary, targetId, REQUEST_TYPE);
    } else if (REQUEST_TITLE && REQUEST_TITLE.trim() !== '') {
        currentLibrary = await handleDirectRequest(currentLibrary, REQUEST_TITLE.trim());
    } else {
        currentLibrary.trending = await fetchStrict100Items('/trending/all/day', 'mixed');
        currentLibrary.movies = await fetchStrict100Items('/discover/movie', 'movie');
        currentLibrary.series = await fetchStrict100Items('/discover/tv', 'tv');
        currentLibrary.kdrama = await fetchStrict100Items('/discover/tv', 'tv', '&with_original_language=ko&with_origin_country=KR');
        currentLibrary.anime = await fetchStrict100Items('/discover/tv', 'tv', '&with_genres=16&with_original_language=ja');
    }

    fs.writeFileSync('library.json', JSON.stringify(currentLibrary, null, 2));
    console.log('🎉 اكتملت العملية بنجاح وتحديث كافة الترجمات وتصفية النصوص المحددة!');
}

runScraper();
