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

// تجهيز مجلد البيانات
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

// قراءة جميع الملفات في مجلد data لجلب الأيديات القديمة ومنع التكرار
function getGlobalSeenIds() {
    let ids = new Set();
    const files = fs.readdirSync(DATA_DIR);
    for (let file of files) {
        if (file.endsWith('.json') && file !== 'index.json') {
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
            // دمج كافة الحقول الخام القادمة من TMDB (budget, genres, production_companies, imdb_id...)
            // ليصبح شكل البيانات مطابقاً تماماً لملف "جون ويك الجزء الأول" - للأفلام فقط
            item = Object.assign({}, details, item);
        } else if (details.seasons) {
            item.seasons = filterValidSeasons(details.seasons);
        }
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
                            // دمج كافة الحقول الخام (نفس منطق جلب جزء واحد) - للأفلام فقط
                            item = Object.assign({}, fullDetails, item);
                        } else if (fullDetails.seasons) {
                            item.seasons = filterValidSeasons(fullDetails.seasons);
                        }
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
        // التحقق مما إذا كان الفيلم جزءاً من سلسلة
        if (finalMediaType === 'movie' && item.belongs_to_collection) {
            console.log(`🔗 الفيلم ينتمي إلى سلسلة: [${item.belongs_to_collection.name}]. جاري سحب جميع الأجزاء...`);
            const collectionData = await fetchCollectionParts(item.belongs_to_collection.id);
            
            if (collectionData && collectionData.parts) {
                // ترتيب الأجزاء من الأقدم للأحدث بناءً على تاريخ الإصدار
                const parts = collectionData.parts.sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0));
                for (let part of parts) {
                    await saveMediaItem(currentRunData, globalSeenIds, { id: part.id }, 'movie');
                }
            }
        } else {
            // إذا كان فيلماً عادياً أو مسلسلاً، يتم حفظه كالمعتاد
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
        console.log("🔄 جاري سحب الأقسام الخمسة لإنشاء ملفات البيانات الجديدة...");
        currentRunData.trending = await fetchStrict100Items('/trending/all/day', 'mixed', globalSeenIds);
        currentRunData.movies = await fetchStrict100Items('/discover/movie', 'movie', globalSeenIds);
        currentRunData.series = await fetchStrict100Items('/discover/tv', 'tv', globalSeenIds);
        currentRunData.kdrama = await fetchStrict100Items('/discover/tv', 'tv', globalSeenIds, '&with_original_language=ko&with_origin_country=KR');
        currentRunData.anime = await fetchStrict100Items('/discover/tv', 'tv', globalSeenIds, '&with_genres=16&with_original_language=ja');
    }

    // كتابة الملفات الجديدة
    let generatedFiles = false;
    for (const [category, items] of Object.entries(currentRunData)) {
        if (items.length > 0) {
            const fileName = `${category}_${timestamp}.json`;
            fs.writeFileSync(path.join(DATA_DIR, fileName), JSON.stringify(items, null, 2));
            console.log(`📁 تم إنشاء ملف جديد: ${fileName} (يحتوي على ${items.length} عنصر)`);
            generatedFiles = true;
        }
    }

    if (generatedFiles || OLD_ID) {
        const allFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
        fs.writeFileSync(path.join(DATA_DIR, 'index.json'), JSON.stringify(allFiles, null, 2));
        console.log(`📋 تم تحديث فهرس الملفات (index.json) بنجاح! الإجمالي: ${allFiles.length} ملف`);
    }

    console.log('🎉 اكتملت العملية بنجاح!');
}

runScraper();
