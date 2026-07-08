// update_library.js
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const REQUEST_TITLE = process.env.REQUEST_TITLE; 
const BASE_URL = 'https://api.themoviedb.org/3';

// 1️⃣ دالة جلب تفاصيل المسلسلات والمواسم كاملة بالإنجليزية لضمان التقسيم الصحيح
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

// دالة مساعدة لطلب تفاصيل أي عنصر (فيلم أو مسلسل) بالإنجليزية بشكل نقي عند الحقن الفوري
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

// 2️⃣ دالة السحب الدوري لـ 100 عنصر نقي ومقسم باللغة الإنجليزية
async function fetchStrict100Items(endpoint, mediaType, extraParams = '') {
    let categoryResults = [];
    let seenIds = new Set();
    let page = 1;

    console.log(`=== بدأ سحب 100 عنصر لقسم: [${mediaType}] باللغة الإنجليزية ===`);

    while (categoryResults.length < 100 && page <= 20) {
        try {
            const separator = endpoint.includes('?') ? '&' : '?';
            // سحب القوائم باللغة الإنجليزية لتوحيد النظام وحل مشاكل المواسم العربية
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
            console.error(`خطأ أثناء السحب:`, error);
            break;
        }
    }
    return categoryResults;
}

// 3️⃣ 🎯 الدالة الذكية للبحث الفوري: تدعم البحث بأي لغة (عربي، إنجليزي، ياباني)
async function handleDirectRequest(libraryData, queryTitle) {
    if (!queryTitle) return libraryData;
    
    console.log(`🚀 استقبال طلب المستخدم للعنوان: "${queryTitle}" وجاري البحث في قاعدة البيانات العالمية...`);
    try {
        // البحث الأولي مع طلب استرجاع البيانات بالإنجليزية
        let searchRes = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(queryTitle)}`);
        let searchData = await searchRes.json();

        // 🧠 ذكاء اصطناعي احتياطي: إذا لم يعثر على نتائج باللغة الإنجليزية (حالة نادرة جداً للأسماء المحلية المكتوبة بالعربي)
        // نقوم بإزالة شرط اللغة ليقوم TMDB بالبحث المطلق والشامل في السيرفرات
        if (!searchData.results || searchData.results.length === 0) {
            console.log(`🔄 تفعيل البحث الموسع بدون قيود لغوية لضمان العثور على النتيجة...`);
            searchRes = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(queryTitle)}`);
            searchData = await searchRes.json();
        }

        if (searchData.results && searchData.results.length > 0) {
            let rawItem = searchData.results[0];
            const mediaType = rawItem.media_type || ((rawItem.title) ? 'movie' : 'tv');
            
            // تحويل العنصر المكتشف إلى بيانات إنجليزية رسمية ونقية لتطابق موقعك تماماً وتفادي دمج المواسم
            const item = await fetchMediaDetails(rawItem.id, mediaType);
            
            if (item && item.poster_path) {
                const isTv = mediaType === 'tv';
                
                let targetCategory = 'trending';
                if (isTv) {
                    if (item.original_language === 'ko') targetCategory = 'kdrama';
                    else if (item.genres && item.genres.some(g => g.id === 16) && item.original_language === 'ja') targetCategory = 'anime';
                    else targetCategory = 'series';
                } else {
                    targetCategory = 'movies';
                }

                // فحص عدم التكرار قبل الحقن
                const exists = libraryData[targetCategory].some(existing => existing.id === item.id);
                if (!exists) {
                    item.media_type = mediaType; // الحفاظ على نوع الميديا للفرونت إند
                    libraryData[targetCategory].unshift(item);
                    libraryData.trending.unshift(item);
                    console.log(`✅ نجاح! تم العثور على العنوان وحقنه باللغة الإنجليزية تحت اسم: [${item.title || item.name}]`);
                } else {
                    console.log(`ℹ️ العنصر [${item.title || item.name}] موجود بالفعل في مكتبتك.`);
                }
            }
        } else {
            console.log(`❌ لم يتم العثور على أي نتائج مطابقة للبحث بـ: "${queryTitle}"`);
        }
    } catch (e) {
        console.error('خطأ أثناء معالجة الريكوست المباشر:', e);
    }
    return libraryData;
}

async function runScraper() {
    if (!TMDB_API_KEY) {
        console.error("خطأ: مفتاح TMDB_API_KEY مفقود.");
        process.exit(1);
    }

    let currentLibrary = { trending: [], movies: [], series: [], kdrama: [], anime: [] };

    if (REQUEST_TITLE && REQUEST_TITLE.trim() !== '') {
        if (fs.existsSync('library.json')) {
            try { currentLibrary = JSON.parse(fs.readFileSync('library.json', 'utf8')); } catch (e) {}
        }
        currentLibrary = await handleDirectRequest(currentLibrary, REQUEST_TITLE.trim());
    } else {
        // التشغيل التلقائي الدوري (كل 30 دقيقة) لبناء المكتبة الرسمية بالإنجليزية وبدون تكرار
        currentLibrary.trending = await fetchStrict100Items('/trending/all/day', 'mixed');
        currentLibrary.movies = await fetchStrict100Items('/discover/movie', 'movie');
        currentLibrary.series = await fetchStrict100Items('/discover/tv', 'tv');
        currentLibrary.kdrama = await fetchStrict100Items('/discover/tv', 'tv', '&with_original_language=ko&with_origin_country=KR');
        currentLibrary.anime = await fetchStrict100Items('/discover/tv', 'tv', '&with_genres=16&with_original_language=ja');
    }

    fs.writeFileSync('library.json', JSON.stringify(currentLibrary, null, 2));
    console.log('🎉 تم التحديث والحفظ بنجاح تام!');
}

runScraper();
