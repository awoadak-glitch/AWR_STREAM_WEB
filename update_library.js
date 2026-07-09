// update_library.js
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 🛡️ دالة الحماية: تقوم بتنظيف النصوص من علامات التنصيص التي تكسر كود الموقع
function sanitizeText(text) {
    if (!text) return text;
    // استبدال الفواصل المبرمجة بفواصل نصية آمنة للقراءة ولا تضر الأكواد
    return text.replace(/'/g, "’").replace(/"/g, "”");
}

async function fetchTvDetails(tvId) {
    try {
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
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=en-US`;
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
                            item.seasons = tvDetails.seasons;
                        }
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
            let rawItem = searchData.results[0];
            const mediaType = rawItem.media_type || ((rawItem.title) ? 'movie' : 'tv');
            
            const item = await fetchMediaDetails(rawItem.id, mediaType);
            
            if (item && item.poster_path) {
                const isTv = mediaType === 'tv';
                item.media_type = mediaType; 

                if (isTv) {
                    const tvDetails = await fetchTvDetails(item.id);
                    if (tvDetails && tvDetails.seasons) item.seasons = tvDetails.seasons;
                }

                // 🛡️ تطبيق الحماية على الطلب الفوري أيضاً
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
                }
            }
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
