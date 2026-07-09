// app.js
const VIDAPI_BASE = 'https://vaplayer.ru/embed';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const IMG_BG = 'https://image.tmdb.org/t/p/original';

let GITHUB_TOKEN = localStorage.getItem('github_token') || '';
let GITHUB_REPO = localStorage.getItem('github_repo') || '';
let globalLibraryData = null;

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('githubTokenInput')) document.getElementById('githubTokenInput').value = GITHUB_TOKEN;
    if(document.getElementById('githubRepoInput')) document.getElementById('githubRepoInput').value = GITHUB_REPO;
    initApp();
    
    // تفعيل خلفية شريط التنقل عند التمرير
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('bg-black/90', 'shadow-lg');
            nav.classList.remove('bg-black/60');
        } else {
            nav.classList.add('bg-black/60');
            nav.classList.remove('bg-black/90', 'shadow-lg');
        }
    });
});

async function initApp() {
    await fetchStaticLibrary();
    setInterval(async () => {
        await fetchStaticLibrary();
    }, 1800000); // مزامنة كل 30 دقيقة
}

async function fetchStaticLibrary() {
    try {
        const response = await fetch(`library.json?t=${Date.now()}`);
        if(!response.ok) throw new Error("Library file not found");
        globalLibraryData = await response.json();
        localStorage.setItem('cachedLibraryData', JSON.stringify(globalLibraryData));
        displayAllContent(globalLibraryData);
    } catch (err) {
        const cached = localStorage.getItem('cachedLibraryData');
        if(cached) {
            globalLibraryData = JSON.parse(cached);
            displayAllContent(globalLibraryData);
        }
    }
}

function displayAllContent(data) {
    if(data.trending && data.trending.length > 0) {
        const hero = data.trending[0];
        document.getElementById('heroImage').src = IMG_BG + hero.backdrop_path;
        document.getElementById('heroTitle').innerText = hero.title || hero.name;
        document.getElementById('heroDesc').innerText = hero.overview || 'محتوى حصري مضاف وجاهز للمشاهدة الفورية.';
    }
    renderCategory(data.trending, 'trendingContainer');
    renderCategory(data.movies, 'moviesContainer', 'movie');
    renderCategory(data.series, 'seriesContainer', 'tv');
    renderCategory(data.kdrama, 'kdramaContainer', 'tv');
    renderCategory(data.anime, 'animeContainer', 'tv');
    
    // تهيئة Swiper مع تحسينات بصرية
    new Swiper('.contentSwiper', { 
        slidesPerView: 'auto', 
        spaceBetween: 16, 
        freeMode: true, 
        observer: true, 
        observeParents: true,
        grabCursor: true
    });
}

function renderCategory(items, containerId, forceType = null) {
    const container = document.getElementById(containerId);
    if(!container) return; container.innerHTML = '';
    
    // إضافة العناصر مع تأخير بسيط للحركة (Stagger effect)
    items.forEach((item, index) => {
        const type = forceType || item.media_type || (item.title ? 'movie' : 'tv');
        const title = item.title || item.name;
        const itemData = encodeURIComponent(JSON.stringify({...item, media_type: type}));
        const vote = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
        
        container.innerHTML += `
            <div class="swiper-slide w-[130px] md:w-[190px] cursor-pointer group animate-fade-in" style="animation-delay: ${index * 0.05}s" onclick="openDetails('${itemData}')">
                <div class="relative rounded-xl overflow-hidden aspect-[2/3] bg-gray-900 transition-all duration-300 transform group-hover:scale-105 group-hover:ring-2 group-hover:ring-brand shadow-lg group-hover:shadow-[0_0_20px_rgba(229,9,20,0.4)]">
                    <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" alt="${title}">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div class="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-brand text-[11px] font-bold px-2 py-1 rounded-md border border-brand/30 shadow-md">
                        ${vote} <i class="fa-solid fa-star"></i>
                    </div>
                    <div class="absolute bottom-0 w-full p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                         <h3 class="text-white text-xs font-bold truncate text-shadow-sm">${title}</h3>
                    </div>
                </div>
            </div>
        `;
    });
}

window.openDetails = (encodedData) => {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const title = item.title || item.name;
    const type = item.media_type;
    const id = item.id;

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = item.overview || 'لا يوجد وصف متاح باللغة العربية حالياً.';
    document.getElementById('modalRating').innerHTML = `<i class="fa-solid fa-star text-yellow-500"></i> ${(item.vote_average ? item.vote_average.toFixed(1) : '0.0')} تقييم`;
    document.getElementById('modalDate').innerHTML = `<i class="fa-regular fa-calendar"></i> ${(item.release_date || item.first_air_date || '').split('-')[0]}`;
    document.getElementById('modalBackdrop').src = IMG_BG + (item.backdrop_path || item.poster_path);
    
    const tvControls = document.getElementById('tvControls');
    const playBtn = document.getElementById('playBtn');
    const iframeWrapper = document.getElementById('iframeWrapper');
    
    iframeWrapper.innerHTML = ''; iframeWrapper.classList.add('hidden'); playBtn.classList.remove('hidden');

    if(type === 'tv' && item.seasons && item.seasons.length > 0) {
        tvControls.classList.remove('hidden');
        const validSeasons = item.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        tvControls.innerHTML = `
            <p class="text-sm font-bold text-white mb-4"><i class="fa-solid fa-layer-group text-brand ml-1"></i> اختر الموسم والحلقة للمشاهدة:</p>
            <div class="flex flex-wrap gap-4">
                <div class="flex-1 min-w-[140px] relative">
                    <select id="seasonSelect" class="w-full bg-black/60 text-white text-sm p-3.5 rounded-xl border border-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand appearance-none transition-all shadow-inner"></select>
                    <i class="fa-solid fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                </div>
                <div class="flex-1 min-w-[140px] relative">
                    <select id="episodeSelect" class="w-full bg-black/60 text-white text-sm p-3.5 rounded-xl border border-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand appearance-none transition-all shadow-inner"></select>
                    <i class="fa-solid fa-chevron-down absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                </div>
            </div>
        `;
        const seasonSelect = document.getElementById('seasonSelect');
        const episodeSelect = document.getElementById('episodeSelect');
        validSeasons.forEach(s => {
            seasonSelect.innerHTML += `<option value="${s.season_number}" data-epcount="${s.episode_count}">الموسم ${s.season_number} (${s.episode_count} حلقة)</option>`;
        });
        const updateEpisodesList = () => {
            const selectedOption = seasonSelect.options[seasonSelect.selectedIndex];
            const epCount = parseInt(selectedOption.dataset.epcount);
            episodeSelect.innerHTML = '';
            for(let i = 1; i <= epCount; i++) episodeSelect.innerHTML += `<option value="${i}">الحلقة ${i}</option>`;
            if(!iframeWrapper.classList.contains('hidden')) loadTvIframe();
        };
        const loadTvIframe = () => {
            iframeWrapper.innerHTML = `<iframe src="${VIDAPI_BASE}/tv/${id}/${seasonSelect.value}/${episodeSelect.value}?autoplay=1" width="100%" height="100%" frameborder="0" allowfullscreen class="rounded-t-2xl md:rounded-none"></iframe>`;
        };
        seasonSelect.onchange = updateEpisodesList;
        episodeSelect.onchange = () => { if(!iframeWrapper.classList.contains('hidden')) loadTvIframe(); };
        updateEpisodesList();
        playBtn.onclick = () => { loadTvIframe(); iframeWrapper.classList.remove('hidden'); playBtn.classList.add('hidden'); };
    } else {
        tvControls.classList.add('hidden');
        playBtn.onclick = () => {
            iframeWrapper.innerHTML = `<iframe src="${VIDAPI_BASE}/movie/${id}?autoplay=1" width="100%" height="100%" frameborder="0" allowfullscreen class="rounded-t-2xl md:rounded-none"></iframe>`;
            iframeWrapper.classList.remove('hidden'); playBtn.classList.add('hidden');
        };
    }
    
    // أنيميشن فتح المودال
    const modal = document.getElementById('detailsModal');
    const modalContent = modal.querySelector('.details-content');
    modal.classList.replace('hidden', 'flex');
    // Forcing reflow
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
    }, 300); // انتظار انتهاء الأنيميشن
};

// البحث المحلي السريع جداً
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    if(query.length < 2 || !globalLibraryData) { resultsContainer.innerHTML = ''; return; }
    resultsContainer.innerHTML = '';
    const allItems = [...globalLibraryData.trending, ...globalLibraryData.movies, ...globalLibraryData.series, ...globalLibraryData.kdrama, ...globalLibraryData.anime];
    const seenIds = new Set();
    
    let count = 0;
    allItems.forEach(item => {
        const title = item.title || item.name || '';
        if(title.toLowerCase().includes(query) && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            const itemData = encodeURIComponent(JSON.stringify(item));
            resultsContainer.innerHTML += `
                <div class="cursor-pointer group animate-fade-in" style="animation-delay: ${count * 0.05}s" onclick="openDetails('${itemData}')">
                    <div class="relative rounded-xl overflow-hidden aspect-[2/3] bg-gray-800 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-brand group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(229,9,20,0.3)]">
                        <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" alt="${title}">
                    </div>
                    <h3 class="text-xs text-center mt-3 text-gray-300 font-bold truncate group-hover:text-white transition-colors">${title}</h3>
                </div>
            `;
            count++;
        }
    });
});

window.switchTab = (tabName) => {
    // تحديث ألوان الأزرار في الأسفل
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-brand');
        btn.classList.add('text-gray-400');
    });
    
    // إخفاء جميع الأقسام مع أنيميشن الخروج
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('animate-fade-in');
    });
    
    const target = document.getElementById(tabName + 'View');
    if(target) {
        target.classList.replace('hidden', 'block');
        // إجبار المتصفح على إعادة رسم العنصر لتشغيل الأنيميشن
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
    setTimeout(() => {
        modal.classList.replace('flex', 'hidden');
    }, 300);
};

window.saveSettings = () => {
    const token = document.getElementById('githubTokenInput').value.trim();
    const repo = document.getElementById('githubRepoInput').value.trim();
    localStorage.setItem('github_token', token);
    localStorage.setItem('github_repo', repo);
    GITHUB_TOKEN = token; GITHUB_REPO = repo;
    
    // إظهار رسالة نجاح جميلة بدلاً من alert العادي
    const btn = document.querySelector('#settingsView button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check-circle text-xl"></i> تم الحفظ وتفعيل الاتصال!';
    btn.classList.replace('from-brand', 'from-green-600');
    btn.classList.replace('to-red-800', 'to-green-800');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.replace('from-green-600', 'from-brand');
        btn.classList.replace('to-green-800', 'to-red-800');
    }, 3000);
};

// 🔥 زر الريكوست الجديد (محدث ليدعم الـ ID ونوع العمل)
window.submitContentRequest = async () => {
    const title = document.getElementById('requestTitleInput').value.trim();
    const id = document.getElementById('requestIdInput').value.trim();
    const type = document.getElementById('requestTypeSelect').value;
    
    const loading = document.getElementById('requestLoading');
    const btn = document.getElementById('submitRequestBtn');

    if(!title && !id) return alert('يرجى كتابة اسم العمل أو إدخال رقم الـ ID على الأقل.');
    if(!GITHUB_TOKEN || !GITHUB_REPO) {
        closeRequestModal();
        switchTab('settings');
        return alert('يرجى إدخال توكن GitHub وإعدادات الريبو أولاً لتشغيل الريكوست.');
    }

    loading.classList.replace('hidden', 'flex');
    btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        // إرسال المتغيرات الثلاثة: الاسم، المعرف، والنوع
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
                    REQUEST_TITLE: title || "", 
                    REQUEST_ID: id || "",
                    REQUEST_TYPE: type || ""
                }
            })
        });

        if(res.status === 204) {
            btn.innerHTML = '<i class="fa-solid fa-check text-xl"></i> تم إطلاق السيرفر بنجاح!';
            btn.classList.replace('from-brand', 'from-green-600');
            btn.classList.replace('to-red-700', 'to-green-700');
            
            setTimeout(() => {
                document.getElementById('requestTitleInput').value = '';
                document.getElementById('requestIdInput').value = '';
                closeRequestModal();
                btn.innerHTML = 'تفعيل السحب المباشر الفوري <i class="fa-solid fa-rocket mr-2"></i>';
                btn.classList.replace('from-green-600', 'from-brand');
                btn.classList.replace('to-green-700', 'to-red-700');
            }, 3000);
            
            // فحص دوري لتحديث الواجهة
            setTimeout(() => { fetchStaticLibrary(); }, 40000);
        } else {
            const errData = await res.json().catch(() => ({}));
            alert('فشل تشغيل الأكشنز: ' + (errData.message || 'تأكد من صلاحيات التوكن والفرع الرئيسي.'));
        }
    } catch(e) {
        alert('خطأ شبكة أثناء تشغيل سيرفر الأتمتة المباشر.');
    } finally {
        setTimeout(() => {
            loading.classList.replace('flex', 'hidden');
            btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-not-allowed');
        }, 3000);
    }
};
