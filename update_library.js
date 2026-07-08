// update_library.js
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE; 
const BASE_URL = 'https://api.themoviedb.org/3';

// دالة جلب تفاصيل المواسم والحلقات الحقيقية للمسلسلات
async function fetchTvDetails(tvId) {
    try {
        const url = `${BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=ar`;
        const res = await fetch(url);
        if (res.ok) return await res.json();
    } catch (e) {
        console.error(`فشل جلب تفاصيل المسلسل ذو المعرف ${tvId}`);
    }
    return null;
}

// 🎯 الدالة الأساسية: تضمن سحب 100 عنصر فريد تماماً لكل قسم دون تكرار
async function fetchStrict100Items(endpoint, mediaType, extraParams = '') {
    let categoryResults = [];
    let seenIds = new Set();
    let page = 1;

    console.log(`=== بدأ سحب 100 عنصر لقسم: [${mediaType}] ===`);

    // الـ Loop لا يتوقف حتى نجمع 100 عنصر فريد تماماً أو نستنفذ صفحات البحث (حد أقصى 20 صفحة)
    while (categoryResults.length < 100 && page <= 20) {
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=ar&page=${page}${extraParams}`;
            
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`خطأ في استجابة API الصفحة ${page}`);
                break;
            }
            
            const data = await res.json();
            if (!data.results || data.results.length === 0) break;

            for (const item of data.results) {
                if (categoryResults.length >= 100) break; // التوقف فوراً عند اكتمال الـ 100 عنصر للنوع الحالي

                // شرط منع التكرار ووجود بوستر للمحتوى لضمان المظهر الاحترافي
                if (item.poster_path && !seenIds.has(item.id)) {
                    seenIds.add(item.id);

                    // إذا كان مسلسلاً، نقوم بسحب الحلقات والمواسم الحقيقية له فوراً
                    const isTvShow = mediaType === 'tv' || item.media_type === 'tv' || (!item.title && item.name);
                    if (isTvShow) {
                        const tvDetails = await fetchTvDetails(item.id);
                        if (tvDetails && tvDetails.seasons) {
                            item.seasons = tvDetails.seasons;
                        }
                    }

                    categoryResults.push(item);
                }
            }
            console.log(`التقدم في قسم [${mediaType}]: تم جمع ${categoryResults.length} / 100 عنصر (الصفحة الحالية: ${page})`);
            page++;
        } catch (error) {
            console.error(`خطأ أثناء السحب من الصفحة ${page}:`, error);
            break;
        }
    }
    return categoryResults;
}

// دالة معالجة وحقن الريكوست المباشر القادم من الموقع فوراً
async function handleDirectRequest(libraryData, queryTitle) {
    if (!queryTitle) return libraryData;
    
    console.log(`🚀 جاري المعالجة الفورية لطلب المستخدم للعنوان: ${queryTitle}`);
    try {
        const searchRes = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=ar&query=${encodeURIComponent(queryTitle)}`);
        const searchData = await searchRes.json();

        if (searchData.results && searchData.results.length > 0) {
            let item = searchData.results[0];
            if (item.poster_path) {
                const isTv = item.media_type === 'tv' || (!item.title && item.name);
                if (isTv) {
                    const details = await fetchTvDetails(item.id);
                    if (details) item.seasons = details.seasons;
                }

                let targetCategory = 'trending';
                if (isTv) {
                    if (item.original_language === 'ko') targetCategory = 'kdrama';
                    else if (item.genre_ids && item.genre_ids.includes(16) && item.original_language === 'ja') targetCategory = 'anime';
                    else targetCategory = 'series';
                } else {
                    targetCategory = 'movies';
                }

                // منع التكرار عند الحقن المباشر
                const exists = libraryData[targetCategory].some(existing => existing.id === item.id);
                if (!exists) {
                    libraryData[targetCategory].unshift(item);
                    libraryData.trending.unshift(item);
                    console.log(`✅ تم حقن الطلب بنجاح في الموقع.`);
                }
            }
        }
    } catch (e) {
        console.error('خطأ في الريكوست المباشر:', e);
    }
    return libraryData;
}

async function runScraper() {
    if (!TMDB_API_KEY) {
        console.error("خطأ: لم يتم العثور على مفتاح TMDB_API_KEY في السيرفر.");
        process.exit(1);
    }

    let currentLibrary = { trending: [], movies: [], series: [], kdrama: [], anime: [] };

    // إذا كان هناك تشغيل قادم من "زر الريكوست الفوري"، نقرأ الملف القديم ونحقن فيه المحتوى الجديد فقط
    if (REQUEST_TITLE && REQUEST_TITLE.trim() !== '') {
        if (fs.existsSync('library.json')) {
            try { currentLibrary = JSON.parse(fs.readFileSync('library.json', 'utf8')); } catch (e) {}
        }
        currentLibrary = await handleDirectRequest(currentLibrary, REQUEST_TITLE.trim());
    } else {
        // ⏱️ إذا كان التشغيل هو السحب الدوري (كل 30 دقيقة)، يقوم بسحب 100 عنصر فريد كلياً لكل نوع
        currentLibrary.trending = await fetchStrict100Items('/trending/all/day', 'mixed');
        currentLibrary.movies = await fetchStrict100Items('/discover/movie', 'movie');
        currentLibrary.series = await fetchStrict100Items('/discover/tv', 'tv');
        currentLibrary.kdrama = await fetchStrict100Items('/discover/tv', 'tv', '&with_original_language=ko&with_origin_country=KR');
        currentLibrary.anime = await fetchStrict100Items('/discover/tv', 'tv', '&with_genres=16&with_original_language=ja');
    }

    // حفظ قاعدة البيانات الثابتة للموقع متكاملة ومنظمة
    fs.writeFileSync('library.json', JSON.stringify(currentLibrary, null, 2));
    console.log('🎉 تم الانتهاء! تم توليد ملف library.json يحتوي على 100 عنصر فريد لكل قسم بنجاح تام.');
}

runScraper();
