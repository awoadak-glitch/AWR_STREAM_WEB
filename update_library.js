// update_library.js
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE; 
const REQUEST_ID = process.env.REQUEST_ID; 
const REQUEST_TYPE = process.env.REQUEST_TYPE;
const REQUEST_ID_TYPE = process.env.REQUEST_ID_TYPE || 'tmdb'; 
const OLD_ID = process.env.OLD_ID; 
const SEASONS_SPLIT = process.env.SEASONS_SPLIT; 
const BASE_URL = 'https://api.themoviedb.org/3';

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
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=ar-SA&append_to_response=translations`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) { console.error(`فشل جلب التفاصيل للعنصر: ${id}`); }
    return null;
}

async function saveMediaItem(libraryData, item, mediaType) {
    const isTv = mediaType === 'tv';
    item.media_type = mediaType;

    const details = await fetchMediaDetails(item.id, mediaType);
    if (details) {
        if (isTv && details.seasons) item.seasons = filterValidSeasons(details.seasons);
        injectDualLanguages(item, details);
    } else {
        item.overview = sanitizeText(item.overview);
        item.title = sanitizeText(item.title || item.name);
        item.title_en = item.title;
        item.overview_en = item.overview;
    }

    if (item.original_title) item.original_title = sanitizeText(item.original_title);
    
    applyManualSeasonsSplit(item);

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
        console.log(`⚠️ العنصر موجود مسبقاً.`);
    }
}

// 📌 تعديل: استقبال المصفوفة الحالية (existingItems) لتخطي ما تم جلبه سابقاً
async function fetchStrict100Items(endpoint, mediaType, existingItems = [], extraParams = '') {
    let categoryResults = [];
    // إنشاء فلتر يحتوي على جميع الأيديات القديمة لمنع تكرارها
    let seenIds = new Set(existingItems.map(item => item.id)); 
    let page = 1;
    console.log(`=== سحب قسم: [${mediaType}] ===`);

    while (categoryResults.length < 100 && page <= 20) {
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ar-SA&page=${page}${extraParams}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const data = await res.json();
            if (!data.results || data.results.length === 0) break;

            for (const item of data.results) {
                if (categoryResults.length >= 100) break; 
                // 📌 التأكد من أن العنصر غير موجود مسبقاً في المكتبة
                if (item.poster_path && !seenIds.has(item.id)) {
                    seenIds.add(item.id);
                    const isTvShow = mediaType === 'tv' || item.media_type === 'tv' || (!item.title && item.name);
                    const actualType = isTvShow ? 'tv' : 'movie';
                    item.media_type = actualType; 

                    const fullDetails = await fetchMediaDetails(item.id, actualType);
                    if (fullDetails) {
                        if (isTvShow && fullDetails.seasons) item.seasons = filterValidSeasons(fullDetails.seasons);
                        injectDualLanguages(item, fullDetails);
                    } else {
                        item.overview = sanitizeText(item.overview);
                        item.title = sanitizeText(item.title || item.name);
                        item.title_en = item.title;
                        item.overview_en = item.overview;
                    }
                    if (item.original_title) item.original_title = sanitizeText(item.original_title);

                    categoryResults.push(item);
                }
            }
            page++;
        } catch (error) { break; }
    }
    return categoryResults;
}

async function handleDirectIdRequest(libraryData, id, type) {
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
    if (item) await saveMediaItem(libraryData, item, finalMediaType);
    return libraryData;
}

async function handleDirectRequest(libraryData, queryTitle) {
    if (!queryTitle) return libraryData;
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
                if (item && item.poster_path) await saveMediaItem(libraryData, item, mediaType);
            }
        }
    } catch (e) { }
    return libraryData;
}

async function runScraper() {
    if (!TMDB_API_KEY) { console.error("Missing TMDB_API_KEY"); process.exit(1); }

    let currentLibrary = { trending: [], movies: [], series: [], kdrama: [], anime: [] };

    if (fs.existsSync('library.json')) {
        try { currentLibrary = JSON.parse(fs.readFileSync('library.json', 'utf8')); } catch (e) {}
    }

    if (OLD_ID) {
        const oldIdNumber = Number(OLD_ID);
        console.log(`⚠️ وضع الإصلاح: جاري حذف العنصر المعطوب (ID: ${oldIdNumber})`);
        for (let category in currentLibrary) {
            currentLibrary[category] = currentLibrary[category].filter(item => item.id !== oldIdNumber);
        }
    }

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

        if (finalId) {
            currentLibrary = await handleDirectIdRequest(currentLibrary, finalId, finalType);
        }
    } else if (REQUEST_TITLE && REQUEST_TITLE.trim() !== '') {
        currentLibrary = await handleDirectRequest(currentLibrary, REQUEST_TITLE.trim());
    } else if (!OLD_ID) { 
        // 📌 التعديل الجذري هنا: نمرر المكتبة الحالية وندمج الناتج
        console.log("🔄 جاري التحديث التلقائي ودمج المحتوى الجديد...");

        const newTrending = await fetchStrict100Items('/trending/all/day', 'mixed', currentLibrary.trending);
        const newMovies = await fetchStrict100Items('/discover/movie', 'movie', currentLibrary.movies);
        const newSeries = await fetchStrict100Items('/discover/tv', 'tv', currentLibrary.series);
        const newKdrama = await fetchStrict100Items('/discover/tv', 'tv', currentLibrary.kdrama, '&with_original_language=ko&with_origin_country=KR');
        const newAnime = await fetchStrict100Items('/discover/tv', 'tv', currentLibrary.anime, '&with_genres=16&with_original_language=ja');

        // 📌 الحد الأقصى للمحتوى في كل قسم حتى لا يتضخم ملف JSON ويؤدي لتعطل الموقع
        const MAX_ITEMS = 500; 

        currentLibrary.trending = [...newTrending, ...currentLibrary.trending].slice(0, MAX_ITEMS);
        currentLibrary.movies = [...newMovies, ...currentLibrary.movies].slice(0, MAX_ITEMS);
        currentLibrary.series = [...newSeries, ...currentLibrary.series].slice(0, MAX_ITEMS);
        currentLibrary.kdrama = [...newKdrama, ...currentLibrary.kdrama].slice(0, MAX_ITEMS);
        currentLibrary.anime = [...newAnime, ...currentLibrary.anime].slice(0, MAX_ITEMS);
    }

    fs.writeFileSync('library.json', JSON.stringify(currentLibrary, null, 2));
    console.log('🎉 اكتملت العملية بنجاح وتم حفظ المكتبة!');
}

runScraper();
