// update_library.js
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 1️⃣ جلب تفاصيل المسلسل والمواسم بالإنجليزية لضمان التقسيم العالمي الصحيح للحلقات
async function fetchTvDetails(tvId) {
    try {
        const url = `${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {
        console.error(`فشل جلب تفاصيل المسلسل ذو المعرف ${tvId}`);
    }
    return null;
}

// جلب تفاصيل العنصر بالكامل بالإنجليزية عند الحقن الفوري لتوحيد البيانات
async function fetchMediaDetails(id, mediaType) {
    try {
        const url = `${BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=en-US`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {
        console.error(`فشل جلب التفاصيل الكاملة للعنصر ${id}`);
    }
    return null;
}

// 2️⃣ دالة السحب الدوري لـ 100 عنصر مع حل مشكلة اختفاء نوع الميديا (media_type)
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

                    // تحديد نوع الميديا بشكل دقيق وحقنه حتماً في العنصر لحل مشكلة "عدم استجابة الزر عند الضغط"
                    const isTvShow = mediaType === 'tv' || item.media_type === 'tv' || (!item.title && item.name);
                    item.media_type = isTvShow ? 'tv' : 'movie'; 

                    if (isTvShow) {
                        const tvDetails = await fetchTvDetails(item.id);
                        if (tvDetails && tvDetails.seasons) {
                            item.seasons = tvDetails.seasons;
                        }
                    }

                    categoryResults.push(item);
                }
            }
            console.log(`التقدم في قسم [${mediaType}]: تم جمع ${categoryResults.length} / 100`);
            page++;
        } catch (error) {
            console.error(`خطأ أثناء السحب الدوري:`, error);
            break;
        }
    }
    return categoryResults;
}

// 3️⃣ 🎯 دالة البحث الفوري الذكية: تدعم البحث بجميع اللغات (عربي، إنجليزي، ياباني) دون قيود
async function handleDirectRequest(libraryData, queryTitle) {
    if (!queryTitle) return libraryData;
    
    // إزالة قيود اللغة من رابط البحث ليعمل كمحرك بحث عالمي عابر للغات
    console.log(`🚀 جاري البحث الشامل عن العنوان: "${queryTitle}" بجميع اللغات المتاحة...`);
    try {
        const searchUrl = `${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(queryTitle)}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
            let rawItem = searchData.results[0];
            // تحديد نوع المحتوى المكتشف تلقائياً
            const mediaType = rawItem.media_type || ((rawItem.title) ? 'movie' : 'tv');
            
            // تحويل العنصر المكتشف إلى تفاصيل كاملة ومقسمة بالإنجليزية لحماية السيرفر والمشاهدة
            const item = await fetchMediaDetails(rawItem.id, mediaType);
            
            if (item && item.poster_path) {
                const isTv = mediaType === 'tv';
                item.media_type = mediaType; // 🛠️ حقن نوع الميديا لضمان عمل زر المشاهدة فوراً للطلب المباشر

                if (isTv) {
                    const tvDetails = await fetchTvDetails(item.id);
                    if (tvDetails && tvDetails.seasons) item.seasons = tvDetails.seasons;
                }

                let targetCategory = 'trending';
                if (isTv) {
                    if (item.original_language === 'ko') targetCategory = 'kdrama';
                    else if (item.genres && item.genres.some(g => g.id === 16) && item.original_language === 'ja') targetCategory = 'anime';
                    else targetCategory = 'series';
                } else {
                    targetCategory = 'movies';
                }

                // منع التكرار في المصفوفات
                const exists = libraryData[targetCategory].some(existing => existing.id === item.id);
                if (!exists) {
                    libraryData[targetCategory].unshift(item);
                    libraryData.trending.unshift(item);
                    console.log(`✅ تم العثور على المحتوى وحقنه بنجاح باسمه العالمي: [${item.title || item.name}]`);
                } else {
                    console.log(`ℹ️ المحتوى موجود بالفعل في الموقع.`);
                }
            }
        } else {
            console.log(`❌ لم يتم العثور على نتائج للبحث عن: "${queryTitle}"`);
        }
    } catch (e) {
        console.error('خطأ أثناء معالجة طلب البحث المباشر:', e);
    }
    return libraryData;
}

async function runScraper() {
    if (!TMDB_API_KEY) {
        console.error("خطأ: مفتاح الـ API مفقود.");
        process.exit(1);
    }

    let currentLibrary = { trending: [], movies: [], series: [], kdrama: [], anime: [] };

    if (REQUEST_TITLE && REQUEST_TITLE.trim() !== '') {
        if (fs.existsSync('library.json')) {
            try { currentLibrary = JSON.parse(fs.readFileSync('library.json', 'utf8')); } catch (e) {}
        }
        currentLibrary = await handleDirectRequest(currentLibrary, REQUEST_TITLE.trim());
    } else {
        // السحب الدوري التلقائي المصلح والمحمي بالكامل
        currentLibrary.trending = await fetchStrict100Items('/trending/all/day', 'mixed');
        currentLibrary.movies = await fetchStrict100Items('/discover/movie', 'movie');
        currentLibrary.series = await fetchStrict100Items('/discover/tv', 'tv');
        currentLibrary.kdrama = await fetchStrict100Items('/discover/tv', 'tv', '&with_original_language=ko&with_origin_country=KR');
        currentLibrary.anime = await fetchStrict100Items('/discover/tv', 'tv', '&with_genres=16&with_original_language=ja');
    }

    fs.writeFileSync('library.json', JSON.stringify(currentLibrary, null, 2));
    console.log('🎉 انتهى الإصلاح الشامل وتحديث البيانات بنجاح!');
}

runScraper();
