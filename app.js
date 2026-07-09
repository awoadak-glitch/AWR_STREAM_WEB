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
    await fetchStaticLibrary();
    setInterval(async () => {
        await fetchStaticLibrary();
    }, 1800000); 
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
    
    items.forEach((item, index) => {
        const type = forceType || item.media_type || (item.title ? 'movie' : 'tv');
        const title = item.title || item.name;
        const itemData = encodeURIComponent(JSON.stringify({...item, media_type: type}));
        const vote = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
        
        container.innerHTML += `
            <div class="swiper-slide w-[140px] md:w-[200px] cursor-pointer group animate-fade-in" style="animation-delay: ${index * 0.03}s" 
                onclick="openDetails('${itemData}')">
                
                <div class="relative rounded-2xl overflow-hidden aspect-[2/3] bg-gray-900 transition-all duration-500 transform group-hover:-translate-y-2 group-hover:ring-2 group-hover:ring-brand shadow-lg group-hover:shadow-[0_15px_30px_rgba(229,9,20,0.3)] border border-white/5">
                    <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" alt="${title}">
                    
                    <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <!-- التقييم -->
                    <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2 py-1 rounded-lg border border-white/10 shadow-md flex items-center gap-1">
                        ${vote} <i class="fa-solid fa-star text-brand"></i>
                    </div>

                    <!-- زر الإصلاح المباشر 🔧 -->
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
    });
}

window.openDetails = (encodedData) => {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const title = item.title || item.name;
    const type = item.media_type;
    const id = item.id;

    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = item.overview || 'لا يوجد وصف متاح.';
    document.getElementById('modalRating').innerHTML = `<i class="fa-solid fa-star text-brand"></i> ${(item.vote_average ? item.vote_average.toFixed(1) : '0.0')} / 10`;
    document.getElementById('modalDate').innerHTML = `<i class="fa-regular fa-calendar text-gray-400"></i> ${(item.release_date || item.first_air_date || '').split('-')[0]}`;
    document.getElementById('modalBackdrop').src = IMG_BG + (item.backdrop_path || item.poster_path);
    
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

// 🛠️ فتح نافذة الإصلاح عبر الزر الجديد المباشر
window.openRepairModal = (encodedData) => {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const id = item.id;
    const title = item.title || item.name;
    const type = item.media_type || (item.title ? 'movie' : 'tv');

    document.getElementById('repairOldIdInput').value = id;
    document.getElementById('repairOldTitle').innerText = title;
    document.getElementById('repairNewIdInput').value = id; 
    document.getElementById('repairNewTypeSelect').value = type === 'tv' ? 'tv' : 'movie';
    
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
    const newType = document.getElementById('repairNewTypeSelect').value;

    if(!newId) return alert('يرجى إدخال الـ ID الصحيح');
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
                    old_id: oldId
                }
            })
        });

        if(res.status === 204) {
            alert('تم إرسال أمر الإصلاح بنجاح! سيتم الحذف والسحب خلال لحظات.');
            closeRepairModal();
        } else {
            alert('فشل إرسال طلب الإصلاح.');
        }
    } catch(e) {
        alert('حدث خطأ في الاتصال.');
    }
};

// البحث وإضافة زر الإصلاح للنتائج أيضاً
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
            const itemData = encodeURIComponent(JSON.stringify({...item, media_type: item.media_type || (item.title ? 'movie' : 'tv')}));
            resultsContainer.innerHTML += `
                <div class="cursor-pointer group animate-scale-in" style="animation-delay: ${count * 0.03}s" onclick="openDetails('${itemData}')">
                    <div class="relative rounded-2xl overflow-hidden aspect-[2/3] bg-gray-800 border border-white/5 transition-all duration-300 group-hover:border-brand/50 group-hover:-translate-y-2 group-hover:shadow-[0_10px_20px_rgba(229,9,20,0.3)]">
                        <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy">
                        
                        <!-- زر الإصلاح المباشر في نتائج البحث 🔧 -->
                        <button onclick="event.stopPropagation(); openRepairModal('${itemData}')" 
                                title="إصلاح هذا العمل"
                                class="absolute top-2 left-2 bg-yellow-600/90 hover:bg-yellow-400 backdrop-blur-md text-white w-7 h-7 rounded-full flex items-center justify-center border border-white/20 shadow-md transition-all duration-300 hover:scale-110 z-30 opacity-90 group-hover:opacity-100">
                            <i class="fa-solid fa-wrench text-[10px]"></i>
                        </button>
                    </div>
                    <h3 class="text-xs text-center mt-3 text-gray-400 font-bold truncate group-hover:text-white transition-colors">${title}</h3>
                </div>
            `;
            count++;
        }
    });
});

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
                    request_type: type || ""
                }
            })
        });

        if(res.status === 204) {
            btn.innerHTML = '<i class="fa-solid fa-check text-xl"></i> تم إطلاق السيرفر بنجاح!';
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
            
            setTimeout(() => { fetchStaticLibrary(); }, 40000);
        } else {
            alert('فشل تشغيل الأكشنز.');
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
