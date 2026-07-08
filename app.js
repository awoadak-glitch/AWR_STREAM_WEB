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
    new Swiper('.contentSwiper', { slidesPerView: 'auto', spaceBetween: 12, freeMode: true, observer: true, observeParents: true });
}

function renderCategory(items, containerId, forceType = null) {
    const container = document.getElementById(containerId);
    if(!container) return; container.innerHTML = '';
    items.forEach(item => {
        const type = forceType || item.media_type || (item.title ? 'movie' : 'tv');
        const title = item.title || item.name;
        const itemData = encodeURIComponent(JSON.stringify({...item, media_type: type}));
        const vote = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
        container.innerHTML += `
            <div class="swiper-slide w-[120px] md:w-[180px] cursor-pointer group" onclick="openDetails('${itemData}')">
                <div class="relative rounded-lg overflow-hidden aspect-[2/3] bg-gray-800 transition transform group-hover:scale-105 group-hover:ring-2 ring-brand">
                    <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover" loading="lazy" alt="${title}">
                    <div class="absolute top-1 right-1 bg-black/80 text-brand text-[10px] font-bold px-1.5 py-0.5 rounded">
                        ${vote} <i class="fa-solid fa-star"></i>
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
    document.getElementById('modalRating').innerText = (item.vote_average ? item.vote_average.toFixed(1) : '0.0') + ' تقييم نقد';
    document.getElementById('modalDate').innerText = (item.release_date || item.first_air_date || '').split('-')[0];
    document.getElementById('modalBackdrop').src = IMG_BG + (item.backdrop_path || item.poster_path);
    
    const tvControls = document.getElementById('tvControls');
    const playBtn = document.getElementById('playBtn');
    const iframeWrapper = document.getElementById('iframeWrapper');
    
    iframeWrapper.innerHTML = ''; iframeWrapper.classList.add('hidden'); playBtn.classList.remove('hidden');

    if(type === 'tv' && item.seasons && item.seasons.length > 0) {
        tvControls.classList.remove('hidden');
        const validSeasons = item.seasons.filter(s => s.season_number > 0 && s.episode_count > 0);
        tvControls.innerHTML = `
            <p class="text-sm text-gray-400 mb-3"><i class="fa-solid fa-layer-group text-brand"></i> اختر الموسم والحلقة:</p>
            <div class="flex gap-3">
                <select id="seasonSelect" class="bg-gray-950 text-white text-xs p-2.5 rounded border border-gray-700 focus:outline-none focus:border-brand"></select>
                <select id="episodeSelect" class="bg-gray-950 text-white text-xs p-2.5 rounded border border-gray-700 focus:outline-none focus:border-brand"></select>
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
            iframeWrapper.innerHTML = `<iframe src="${VIDAPI_BASE}/tv/${id}/${seasonSelect.value}/${episodeSelect.value}?autoplay=1" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
        };
        seasonSelect.onchange = updateEpisodesList;
        episodeSelect.onchange = () => { if(!iframeWrapper.classList.contains('hidden')) loadTvIframe(); };
        updateEpisodesList();
        playBtn.onclick = () => { loadTvIframe(); iframeWrapper.classList.remove('hidden'); playBtn.classList.add('hidden'); };
    } else {
        tvControls.classList.add('hidden');
        playBtn.onclick = () => {
            iframeWrapper.innerHTML = `<iframe src="${VIDAPI_BASE}/movie/${id}?autoplay=1" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
            iframeWrapper.classList.remove('hidden'); playBtn.classList.add('hidden');
        };
    }
    document.getElementById('detailsModal').classList.replace('hidden', 'flex');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('detailsModal').classList.replace('flex', 'hidden');
    document.body.style.overflow = 'auto'; document.getElementById('iframeWrapper').innerHTML = '';
};

// البحث المحلي السريع جداً داخل الـ JSON الثابت لضمان عدم استهلاك الـ API
document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    if(query.length < 2 || !globalLibraryData) { resultsContainer.innerHTML = ''; return; }
    resultsContainer.innerHTML = '';
    const allItems = [...globalLibraryData.trending, ...globalLibraryData.movies, ...globalLibraryData.series, ...globalLibraryData.kdrama, ...globalLibraryData.anime];
    const seenIds = new Set();
    allItems.forEach(item => {
        const title = item.title || item.name || '';
        if(title.toLowerCase().includes(query) && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            const itemData = encodeURIComponent(JSON.stringify(item));
            resultsContainer.innerHTML += `
                <div class="cursor-pointer group" onclick="openDetails('${itemData}')">
                    <div class="relative rounded-md overflow-hidden aspect-[2/3] bg-gray-800">
                        <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover transition group-hover:scale-110" alt="${title}">
                    </div>
                    <h3 class="text-xs text-center mt-2 text-gray-300 truncate group-hover:text-white">${title}</h3>
                </div>
            `;
        }
    });
});

window.switchTab = (tabName) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.replace('block', 'hidden'));
    const target = document.getElementById(tabName + 'View');
    if(target) target.classList.replace('hidden', 'block');
    window.scrollTo(0,0);
};

window.openRequestModal = () => {
    document.getElementById('requestModal').classList.replace('hidden', 'flex');
};

window.saveSettings = () => {
    const token = document.getElementById('githubTokenInput').value.trim();
    const repo = document.getElementById('githubRepoInput').value.trim();
    localStorage.setItem('github_token', token);
    localStorage.setItem('github_repo', repo);
    GITHUB_TOKEN = token; GITHUB_REPO = repo;
    alert('تم تفعيل الاتصال المباشر بنظام الريكوست والـ Actions بنجاح!');
};

// 🔥 زر الريكوست الجديد: يقوم بتشغيل الـ GitHub Workflow يدوياً ويمرر اسم الفيلم مباشرة
window.submitContentRequest = async () => {
    const title = document.getElementById('requestTitleInput').value.trim();
    const loading = document.getElementById('requestLoading');
    const btn = document.getElementById('submitRequestBtn');

    if(!title) return alert('يرجى كتابة اسم العمل المطلوب أولاً.');
    if(!GITHUB_TOKEN || !GITHUB_REPO) return alert('يرجى إدخال توكن GitHub وإعدادات الريبو في صفحة الإعدادات لتشغيل الريكوست.');

    loading.classList.replace('hidden', 'flex');
    btn.disabled = true; btn.classList.add('opacity-50');

    try {
        // استدعاء الـ API الخاص بجيت هاب لتشغيل الملف update-library.yml فوراً مع التمرير
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/update-library.yml/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ref: 'main', // أو 'master' حسب اسم الفرع الرئيسي لديك
                inputs: {
                    request_title: title // إرسال اسم الفيلم كمدخل رسمي للسكربت الخارجي
                }
            })
        });

        if(res.status === 204) { // 204 ترمز إلى قبول الطلب بنجاح وبدء تشغيل السيرفر فوراً
            alert(`🚀 تم تشغيل سيرفر GitHub بنجاح! سيقوم السكربت بالبحث عن [${title}] وحقنه داخل ملف library.json الثابت وتحديث الموقع تلقائياً خلال دقيقة.`);
            document.getElementById('requestTitleInput').value = '';
            document.getElementById('requestModal').classList.replace('flex', 'hidden');
            
            // فحص دوري تلقائي لتحديث الواجهة أمام عين المستخدم بعد انتهاء عمل السيرفر
            setTimeout(() => { fetchStaticLibrary(); }, 40000);
        } else {
            const errData = await res.json().catch(() => ({}));
            alert('فشل تشغيل الأكشنز: ' + (errData.message || 'تأكد من صلاحيات التوكن والفرع الرئيسي للمستودع.'));
        }
    } catch(e) {
        alert('خطأ شبكة أثناء تشغيل سيرفر الأتمتة المباشر.');
    } finally {
        loading.classList.replace('flex', 'hidden');
        btn.disabled = false; btn.classList.remove('opacity-50');
    }
};
