// app.js
const VIDAPI_BASE = 'https://vaplayer.ru/embed';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const IMG_BG = 'https://image.tmdb.org/t/p/original';

let GITHUB_TOKEN = localStorage.getItem('github_token') || '';
let GITHUB_REPO = localStorage.getItem('github_repo') || '';

// قاعدة البيانات المجمعة
let globalLibraryData = { trending: [], movies: [], series: [], kdrama: [], anime: [] };
let fileQueue = [];
let isFetchingBatch = false;
let isFirstLoad = true;

// متغيرات نظام البحث الشامل
let allSearchData = [];
let isAllSearchDataLoaded = false;
let searchDataPromise = null;

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('githubTokenInput')) document.getElementById('githubTokenInput').value = GITHUB_TOKEN;
    if(document.getElementById('githubRepoInput')) document.getElementById('githubRepoInput').value = GITHUB_REPO;
    initApp();
    
    // تأثيرات النافبار
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('bg-black/80', 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]', 'border-white/10');
            nav.classList.remove('bg-black/40', 'border-white/5');
        } else {
            nav.classList.add('bg-black/40', 'border-white/5');
            nav.classList.remove('bg-black/80', 'shadow-[0_10px_30px_rgba(0,0,0,0.5)]', 'border-white/10');
        }
    });
});

async function initApp() {
    await fetchIndexAndLoadInitial();
    setupLazyLoadingObserver();
    
    // تحديث صامت للمكتبة كل نصف ساعة
    setInterval(async () => {
        if(fileQueue.length === 0 && !isFetchingBatch) {
            await fetchIndexAndLoadInitial(true);
        }
    }, 1800000); 
}

// 📌 جلب الفهرس وترتيب الملفات
async function fetchIndexAndLoadInitial(isSilentUpdate = false) {
    try {
        const response = await fetch(`data/index.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("Index file not found");
        let files = await response.json();
        
        // ترتيب الملفات من الأحدث إلى الأقدم بناءً على التايم ستامب في اسم الملف
        files.sort((a, b) => {
            const timeA = parseInt(a.match(/\d+/) || [0])[0];
            const timeB = parseInt(b.match(/\d+/) || [0])[0];
            return timeB - timeA;
        });

        fileQueue = files;
        
        // تصفير البيانات إذا لم يكن التحديث صامتاً
        if (!isSilentUpdate) {
            globalLibraryData = { trending: [], movies: [], series: [], kdrama: [], anime: [] };
            clearAllContainers();
            
            // تفريغ بيانات البحث عند كل تحديث جديد للفهرس
            isAllSearchDataLoaded = false;
            searchDataPromise = null;
            allSearchData = [];
        }

        // تحميل أول 10 ملفات كدفعة أولى لسرعة فتح الموقع
        await loadNextBatch(10);
        
        if (isFirstLoad) {
            initSwipers();
            isFirstLoad = false;
        }

    } catch (err) {
        console.error("خطأ في قراءة الدليل:", err);
    }
}

// 📌 تحميل دفعة من الملفات (Lazy Loading Core)
async function loadNextBatch(count = 5) {
    if(isFetchingBatch || fileQueue.length === 0) return;
    isFetchingBatch = true;

    const batch = fileQueue.splice(0, count);
    
    await Promise.all(batch.map(async (file) => {
        try {
            const res = await fetch(`data/${file}?t=${Date.now()}`); // تفادي الكاش
            const data = await res.json();
            const category = file.split('_')[0]; // استخراج القسم (movies, series...) من اسم الملف
            
            if (globalLibraryData[category]) {
                globalLibraryData[category].push(...data);
                appendItemsToDOM(data, `${category}Container`, category);
            }
        } catch (e) { console.error(`فشل تحميل الملف: ${file}`); }
    }));

    // تحديث صورة الغلاف العلوية بأول عنصر تريندنج تم تحميله
    if(globalLibraryData.trending.length > 0) {
        const hero = globalLibraryData.trending[0];
        const heroImg = document.getElementById('heroImage');
        const heroTitle = document.getElementById('heroTitle');
        const heroDesc = document.getElementById('heroDesc');
        
        if (heroImg && !heroImg.src.includes(hero.backdrop_path)) {
            heroImg.src = IMG_BG + hero.backdrop_path;
            if(heroTitle) heroTitle.innerText = hero.title || hero.name;
            if(heroDesc) heroDesc.innerText = hero.overview || 'محتوى حصري مضاف وجاهز للمشاهدة الفورية.';
        }
    }

    isFetchingBatch = false;
}

// 📌 مراقب النزول لأسفل الصفحة لتفعيل السحب التلقائي (Intersection Observer)
function setupLazyLoadingObserver() {
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting) {
            await loadNextBatch(5); // جلب 5 ملفات عند الوصول للنهاية
        }
    }, { rootMargin: '300px' }); // تفعيل السحب قبل 300 بكسل من الوصول للنهاية

    let target = document.getElementById('lazyLoadTrigger');
    if (!target) {
        target = document.createElement('div');
        target.id = 'lazyLoadTrigger';
        target.style.height = '10px';
        document.body.appendChild(target);
    }
    observer.observe(target);
}

function clearAllContainers() {
    ['trending', 'movies', 'series', 'kdrama', 'anime'].forEach(cat => {
        const el = document.getElementById(`${cat}Container`);
        if(el) el.innerHTML = '';
    });
}

function appendItemsToDOM(items, containerId, forceType = null) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    let htmlContent = '';
    
    items.forEach((item, index) => {
        htmlContent += generateCardHTML(item, index, forceType);
    });
    
    // إدراج العناصر بسلاسة دون مسح القديم
    container.insertAdjacentHTML('beforeend', htmlContent);
}

// 📌 دالة توليد كرت العمل الفني
function generateCardHTML(item, index, forceType) {
    const type = forceType || item.media_type || (item.title ? 'movie' : 'tv');
    const title = item.title || item.name || 'عنصر غير معروف';
    const itemData = encodeURIComponent(JSON.stringify({...item, media_type: type})).replace(/'/g, "%27");
    const vote = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
    const poster = item.poster_path ? (IMG_URL + item.poster_path) : 'https://via.placeholder.com/500x750?text=No+Image';
    
    return `
        <div class="swiper-slide w-[140px] md:w-[200px] cursor-pointer group animate-fade-in" style="animation-delay: ${(index % 10) * 0.03}s" 
            onclick="openDetails('${itemData}')">
            
            <div class="relative rounded-2xl overflow-hidden aspect-[2/3] bg-gray-900 transition-all duration-500 transform group-hover:-translate-y-2 group-hover:ring-2 group-hover:ring-brand shadow-lg group-hover:shadow-[0_15px_30px_rgba(229,9,20,0.3)] border border-white/5">
                <img src="${poster}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" alt="${title}">
                
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2 py-1 rounded-lg border border-white/10 shadow-md flex items-center gap-1">
                    ${vote} <i class="fa-solid fa-star text-brand"></i>
                </div>

                <button onclick="event.stopPropagation(); openRepairModal('${itemData}')" 
                        title="إصلاح هذا العمل"
                        class="absolute top-2 left-2 bg-yellow-600/90 hover:bg-yellow-400 backdrop-blur-md text-white w-8 h-8 rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-110 z-30 opacity-90 group-hover:opacity-100">
                    <i class="fa-solid fa-wrench text-xs md:text-sm"></i>
                </button>

                <div class="absolute bottom-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                     <h3 class="text-white text-sm font-bold truncate text-shadow-md">${title}</h3>
                </div>
            </div>
        </div>
    `;
}

function initSwipers() {
    new Swiper('.contentSwiper', { 
        slidesPerView: 'auto', 
        spaceBetween: 16, 
        freeMode: true, 
        observer: true,       // هذه الخاصية ضرورية جداً مع ال Lazy Load
        observeParents: true, // لتحديث السلايدر تلقائياً عند إضافة كروت جديدة
        grabCursor: true
    });
}

// ============================================
// الجزء الخاص بالنوافذ المنبثقة (Modals) والمشغل
// ============================================

window.openDetails = (encodedData) => {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const title = item.title || item.name;
    
    const titleEnHtml = item.title_en ? `<span class="text-xl md:text-2xl text-gray-400 block mt-1 font-normal" dir="ltr">${item.title_en}</span>` : '';
    document.getElementById('modalTitle').innerHTML = `${title} ${titleEnHtml}`;
    
    let descHtml = item.overview || 'لا يوجد وصف متاح.';
    if(item.overview_en && item.overview_en !== item.overview) {
        descHtml += `<div class="mt-4 pt-4 border-t border-white/5 text-gray-400 text-sm font-sans" dir="ltr"><strong>English Overview:</strong><br>${item.overview_en}</div>`;
    }
    document.getElementById('modalDesc').innerHTML = descHtml;

    const type = item.media_type;
    const id = item.id;

    document.getElementById('modalRating').innerHTML = `<i class="fa-solid fa-star text-brand"></i> ${(item.vote_average ? item.vote_average.toFixed(1) : '0.0')} / 10`;
    document.getElementById('modalDate').innerHTML = `<i class="fa-regular fa-calendar text-gray-400"></i> ${(item.release_date || item.first_air_date || '').split('-')[0]}`;
    document.getElementById('modalBackdrop').src = item.backdrop_path ? (IMG_BG + item.backdrop_path) : (item.poster_path ? (IMG_BG + item.poster_path) : 'https://via.placeholder.com/1920x1080?text=No+Image');
    
    const tvControls = document.getElementById('tvControls');
    const playBtn = document.getElementById('playBtn');
    const iframeWrapper = document.getElementById('iframeWrapper');
    
    iframeWrapper.innerHTML = ''; iframeWrapper.classList.add('hidden'); playBtn.classList.remove('hidden');

    if(type === 'tv' && item.seasons && item.seasons.length > 0) {
        tvControls.classList.remove('hidden');
        const validSeasons = item.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        tvControls.innerHTML = `
            <p class="text-sm font-bold text-white mb-4"><i class="fa-solid fa-list text-brand ml-2"></i> اختر الموسم والحلقة:</p>
            <div class="flex flex-wrap gap-4">
                <div class="flex-1 min-w-[140px] relative group">
                    <select id="seasonSelect" class="w-full bg-black/60 text-white text-sm p-4 rounded-xl border border-white/10 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand appearance-none transition-all shadow-inner"></select>
                    <i class="fa-solid fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand transition-colors pointer-events-none"></i>
                </div>
                <div class="flex-1 min-w-[140px] relative group">
                    <select id="episodeSelect" class="w-full bg-black/60 text-white text-sm p-4 rounded-xl border border-white/10 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand appearance-none transition-all shadow-inner"></select>
                    <i class="fa-solid fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand transition-colors pointer-events-none"></i>
                </div>
            </div>
        `;
        const seasonSelect = document.getElementById('seasonSelect');
        const episodeSelect = document.getElementById('episodeSelect');
        validSeasons.forEach(s => {
            seasonSelect.innerHTML += `<option value="${s.season_number}" data-epcount="${s.episode_count}">الموسم ${s.season_number}</option>`;
        });
        const updateEpisodesList = () => {
            const selectedOption = seasonSelect.options[seasonSelect.selectedIndex];
            const epCount = parseInt(selectedOption.dataset.epcount);
            episodeSelect.innerHTML = '';
            for(let i = 1; i <= epCount; i++) episodeSelect.innerHTML += `<option value="${i}">الحلقة ${i}</option>`;
            if(!iframeWrapper.classList.contains('hidden')) loadTvIframe();
        };
        const loadTvIframe = () => {
            iframeWrapper.innerHTML = `<iframe src="${VIDAPI_BASE}/tv/${id}/${seasonSelect.value}/${episodeSelect.value}?autoplay=1" width="100%" height="100%" frameborder="0" allowfullscreen class="rounded-t-3xl md:rounded-none"></iframe>`;
        };
        seasonSelect.onchange = updateEpisodesList;
        episodeSelect.onchange = () => { if(!iframeWrapper.classList.contains('hidden')) loadTvIframe(); };
        updateEpisodesList();
        playBtn.onclick = () => { loadTvIframe(); iframeWrapper.classList.remove('hidden'); playBtn.classList.add('hidden'); };
    } else {
        tvControls.classList.add('hidden');
        playBtn.onclick = () => {
            iframeWrapper.innerHTML = `<iframe src="${VIDAPI_BASE}/movie/${id}?autoplay=1" width="100%" height="100%" frameborder="0" allowfullscreen class="rounded-t-3xl md:rounded-none"></iframe>`;
            iframeWrapper.classList.remove('hidden'); playBtn.classList.add('hidden');
        };
    }
    
    const modal = document.getElementById('detailsModal');
    const modalContent = modal.querySelector('.details-content');
    modal.classList.replace('hidden', 'flex');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    modalContent.classList.remove('scale-95');
    
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    const modal = document.getElementById('detailsModal');
    const modalContent = modal.querySelector('.details-content');
    
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.replace('flex', 'hidden');
        document.body.style.overflow = 'auto'; 
        document.getElementById('iframeWrapper').innerHTML = '';
    }, 300);
};

// ============================================
// نظام الإصلاح (Repair System)
// ============================================

window.openRepairModal = (encodedData) => {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const id = item.id || '';
    const title = item.title || item.name || 'عنصر غير معروف';
    const type = item.media_type || (item.title ? 'movie' : 'tv');

    document.getElementById('repairOldIdInput').value = id;
    document.getElementById('repairOldTitle').innerText = title;
    document.getElementById('repairNewIdInput').value = id; 
    document.getElementById('repairNewIdTypeSelect').value = 'tmdb'; 
    document.getElementById('repairNewTypeSelect').value = type === 'tv' ? 'tv' : 'movie';
    document.getElementById('repairSeasonsSplitInput').value = ''; 
    
    const modal = document.getElementById('repairModal');
    const modalContent = modal.querySelector('.repair-content');
    modal.classList.replace('hidden', 'flex');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    modalContent.classList.remove('scale-95');
};

window.closeRepairModal = () => {
    const modal = document.getElementById('repairModal');
    const modalContent = modal.querySelector('.repair-content');
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => { modal.classList.replace('flex', 'hidden'); }, 300);
};

window.submitRepairRequest = async () => {
    const oldId = document.getElementById('repairOldIdInput').value;
    const newId = document.getElementById('repairNewIdInput').value.trim();
    const newIdType = document.getElementById('repairNewIdTypeSelect').value;
    const newType = document.getElementById('repairNewTypeSelect').value;
    const seasonsSplit = document.getElementById('repairSeasonsSplitInput').value.trim(); 

    if(!newId) return alert('يرجى إدخال المعرف (ID) الصحيح');
    if(!GITHUB_TOKEN || !GITHUB_REPO) return alert('يرجى إعداد التوكن في الإعدادات أولاً');

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/update-library.yml/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: 'main', 
                inputs: {
                    request_id: newId,
                    request_type: newType,
                    request_id_type: newIdType, 
                    old_id: oldId,
                    seasons_split: seasonsSplit 
                }
            })
        });

        if(res.status === 204) {
            alert('تم إرسال أمر الإصلاح بنجاح! سيتم التعديل خلال لحظات.');
            closeRepairModal();
        } else {
            alert('فشل إرسال طلب الإصلاح.');
        }
    } catch(e) {
        alert('حدث خطأ في الاتصال.');
    }
};

// ============================================
// نظام البحث الشامل (مستقل ويعمل على كل الملفات)
// ============================================

document.getElementById('searchInput').addEventListener('input', async (e) => {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if(query.length < 2) { 
        resultsContainer.innerHTML = ''; 
        return; 
    }

    // إذا لم يتم تحميل جميع بيانات البحث مسبقاً، اجلبها الآن
    if (!isAllSearchDataLoaded) {
        // رسالة تحميل مرئية للمستخدم
        resultsContainer.innerHTML = `
            <div class="col-span-full text-center text-gray-400 py-10 w-full flex flex-col items-center gap-3">
                <i class="fa-solid fa-circle-notch animate-spin text-brand text-3xl"></i>
                <span class="text-sm font-bold animate-pulse">جاري فحص جميع ملفات السيرفر لجلب كافة النتائج...</span>
            </div>
        `;
        
        if (!searchDataPromise) {
            searchDataPromise = (async () => {
                try {
                    // إضافة التاريخ لتخطي الكاش تماماً وقراءة أحدث ما أضافه السكربت التلقائي
                    const response = await fetch(`data/index.json?t=${Date.now()}`);
                    const files = await response.json();
                    
                    const fetchPromises = files.map(file => 
                        fetch(`data/${file}?t=${Date.now()}`).then(res => res.json()).catch(() => [])
                    );
                    
                    const allResults = await Promise.all(fetchPromises);
                    allSearchData = allResults.flat();
                    isAllSearchDataLoaded = true;
                } catch(err) {
                    console.error("خطأ أثناء جلب الملفات:", err);
                }
            })();
        }
        
        await searchDataPromise; 
    }

    // بعد الانتهاء من التحميل، نفذ البحث على المتغير المجمع
    let count = 0;
    let resultsHtml = '';
    const seenKeys = new Set();
    
    allSearchData.forEach(item => {
        const titleAr = (item.title || item.name || '').toLowerCase();
        const titleEn = (item.title_en || '').toLowerCase();
        const originalTitle = (item.original_title || item.original_name || '').toLowerCase();
        
        if(titleAr.includes(query) || titleEn.includes(query) || originalTitle.includes(query)) {
            
            // ربط الـ ID مع العنوان يضمن ظهور جميع الأجزاء حتى لو تشابهت هوياتها
            const uniqueKey = item.id + '_' + titleAr;
            
            if (!seenKeys.has(uniqueKey)) {
                seenKeys.add(uniqueKey);
                
                const displayTitle = item.title || item.name || 'عنصر غير معروف';
                const itemData = encodeURIComponent(JSON.stringify({...item, media_type: item.media_type || (item.title ? 'movie' : 'tv')})).replace(/'/g, "%27");
                const poster = item.poster_path ? (IMG_URL + item.poster_path) : 'https://via.placeholder.com/500x750?text=No+Image';

                resultsHtml += `
                    <div class="cursor-pointer group animate-scale-in" style="animation-delay: ${(count % 10) * 0.03}s" onclick="openDetails('${itemData}')">
                        <div class="relative rounded-2xl overflow-hidden aspect-[2/3] bg-gray-800 border border-white/5 transition-all duration-300 group-hover:border-brand/50 group-hover:-translate-y-2 group-hover:shadow-[0_10px_20px_rgba(229,9,20,0.3)]">
                            <img src="${poster}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy">
                        </div>
                        <h3 class="text-xs text-center mt-3 text-gray-400 font-bold truncate group-hover:text-white transition-colors">${displayTitle}</h3>
                    </div>
                `;
                count++;
            }
        }
    });

    if(count === 0) {
        resultsContainer.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10 w-full">لا توجد نتائج مطابقة لـ "${e.target.value}".</div>`;
    } else {
        resultsContainer.innerHTML = resultsHtml;
    }
});

// ============================================
// نظام التنقل والأزرار (Tabs & Modals)
// ============================================

window.switchTab = (tabName) => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-brand');
        btn.classList.add('text-gray-400');
        btn.querySelector('div')?.classList.replace('from-brand', 'bg-transparent');
        btn.querySelector('div')?.classList.replace('border-[3px]', 'border-transparent');
    });
    
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('animate-fade-in');
    });
    
    const target = document.getElementById(tabName + 'View');
    if(target) {
        target.classList.replace('hidden', 'block');
        void target.offsetWidth; 
        target.classList.add('animate-fade-in');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.openRequestModal = () => {
    const modal = document.getElementById('requestModal');
    const modalContent = modal.querySelector('.request-content');
    modal.classList.replace('hidden', 'flex');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    modalContent.classList.remove('scale-95');
};

window.closeRequestModal = () => {
    const modal = document.getElementById('requestModal');
    const modalContent = modal.querySelector('.request-content');
    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => { modal.classList.replace('flex', 'hidden'); }, 300);
};

window.saveSettings = () => {
    const token = document.getElementById('githubTokenInput').value.trim();
    const repo = document.getElementById('githubRepoInput').value.trim();
    localStorage.setItem('github_token', token);
    localStorage.setItem('github_repo', repo);
    GITHUB_TOKEN = token; GITHUB_REPO = repo;
    
    const btn = document.querySelector('#settingsView button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check-circle text-xl"></i> تم الحفظ بنجاح!';
    btn.classList.replace('from-brand', 'from-green-600');
    btn.classList.replace('to-red-800', 'to-green-800');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.replace('from-green-600', 'from-brand');
        btn.classList.replace('to-green-800', 'to-red-800');
    }, 3000);
};

window.submitContentRequest = async () => {
    const title = document.getElementById('requestTitleInput').value.trim();
    const id = document.getElementById('requestIdInput').value.trim();
    const idType = document.getElementById('requestIdTypeSelect').value; 
    const type = document.getElementById('requestTypeSelect').value;
    
    const loading = document.getElementById('requestLoading');
    const btn = document.getElementById('submitRequestBtn');

    if(!title && !id) return alert('يرجى كتابة اسم العمل أو إدخال رقم الـ ID.');
    if(!GITHUB_TOKEN || !GITHUB_REPO) {
        closeRequestModal();
        switchTab('settings');
        return alert('يرجى إدخال التوكن وإعدادات المستودع أولاً.');
    }

    loading.classList.replace('hidden', 'flex');
    btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/update-library.yml/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: 'main', 
                inputs: {
                    request_title: title || "", 
                    request_id: id || "",
                    request_type: type || "",
                    request_id_type: idType 
                }
            })
        });

        if(res.status === 204) {
            btn.innerHTML = '<i class="fa-solid fa-check text-xl"></i> تم إرسال الطلب!';
            btn.classList.replace('from-brand', 'from-green-500');
            btn.classList.replace('to-red-700', 'to-green-700');
            
            setTimeout(() => {
                document.getElementById('requestTitleInput').value = '';
                document.getElementById('requestIdInput').value = '';
                closeRequestModal();
                btn.innerHTML = 'تفعيل السحب المباشر <i class="fa-solid fa-rocket mr-2"></i>';
                btn.classList.replace('from-green-500', 'from-brand');
                btn.classList.replace('to-green-700', 'to-red-700');
            }, 3000);
            
        } else { alert('فشل تشغيل الأكشنز.'); }
    } catch(e) { alert('خطأ في الاتصال.'); } 
    finally {
        setTimeout(() => {
            loading.classList.replace('flex', 'hidden');
            btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }, 3000);
    }
};
