// 1. إعدادات TMDB API (استبدل YOUR_API_KEY بمفتاحك الحقيقي)
const TMDB_API_KEY = '62571b988e8d17fac56d5240f5610ef0'; // ضع مفتاحك هنا
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';
const IMG_BG = 'https://image.tmdb.org/t/p/original';

// 2. إعدادات VidAPI (حسب الصور المرفقة)
const VIDAPI_BASE = 'https://vaplayer.ru/embed';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await fetchContent('/trending/all/day', 'trendingContainer');
    await fetchContent('/movie/popular', 'moviesContainer', 'movie');
    await fetchContent('/tv/popular', 'seriesContainer', 'tv');
    
    // إعداد السويبر بعد جلب البيانات
    new Swiper('.contentSwiper', {
        slidesPerView: 'auto',
        spaceBetween: 12,
        freeMode: true,
    });
}

// دالة جلب البيانات من TMDB
async function fetchContent(endpoint, containerId, forceType = null) {
    try {
        const res = await fetch(`${BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=ar`);
        const data = await res.json();
        
        // تعيين الهيرو من أول نتيجة في التريندنج
        if(containerId === 'trendingContainer' && data.results.length > 0) {
            const hero = data.results[0];
            document.getElementById('heroImage').src = IMG_BG + hero.backdrop_path;
            document.getElementById('heroTitle').innerText = hero.title || hero.name;
            document.getElementById('heroDesc').innerText = hero.overview || 'لا يوجد وصف عربي متاح.';
        }

        const container = document.getElementById(containerId);
        container.innerHTML = ''; // تفريغ الحاوية

        data.results.forEach(item => {
            if(!item.poster_path) return; // تخطي العناصر بدون صور
            const type = forceType || item.media_type;
            const title = item.title || item.name;
            const itemData = encodeURIComponent(JSON.stringify({...item, media_type: type}));
            
            container.innerHTML += `
                <div class="swiper-slide w-[120px] md:w-[180px] cursor-pointer group" onclick="openDetails('${itemData}')">
                    <div class="relative rounded-lg overflow-hidden aspect-[2/3] bg-gray-800 transition transform group-hover:scale-105 group-hover:ring-2 ring-brand">
                        <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover" loading="lazy" alt="${title}">
                        <div class="absolute top-1 right-1 bg-black/80 text-brand text-[10px] font-bold px-1.5 py-0.5 rounded">
                            ${item.vote_average.toFixed(1)} <i class="fa-solid fa-star"></i>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// 3. نظام النافذة المنبثقة وتشغيل الفيديو عبر VidAPI
window.openDetails = (encodedData) => {
    const item = JSON.parse(decodeURIComponent(encodedData));
    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date;
    const type = item.media_type; // 'movie' or 'tv'
    const id = item.id; // TMDB ID

    // تعبئة البيانات
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalDesc').innerText = item.overview || 'وصف غير متوفر حالياً.';
    document.getElementById('modalRating').innerText = item.vote_average.toFixed(1) + ' تقييم';
    document.getElementById('modalDate').innerText = date ? date.split('-')[0] : '';
    document.getElementById('modalBackdrop').src = IMG_BG + (item.backdrop_path || item.poster_path);
    
    // إظهار/إخفاء ملاحظة المسلسلات
    const tvControls = document.getElementById('tvControls');
    tvControls.classList.toggle('hidden', type !== 'tv');

    // إعداد زر التشغيل
    const playBtn = document.getElementById('playBtn');
    const iframeWrapper = document.getElementById('iframeWrapper');
    
    // إعادة ضبط المشغل (إخفاء الفيديو وإظهار زر التشغيل)
    iframeWrapper.innerHTML = '';
    iframeWrapper.classList.add('hidden');
    playBtn.classList.remove('hidden');

    // منطق توليد رابط VidAPI بناءً على الصور المرفقة
    playBtn.onclick = () => {
        let embedUrl = '';
        if(type === 'movie') {
            // حسب التوثيق: /embed/movie/{id}
            embedUrl = `${VIDAPI_BASE}/movie/${id}?autoplay=1`;
        } else {
            // حسب التوثيق: /embed/tv/{id}/{season}/{episode}
            // حالياً نشغل الموسم 1 الحلقة 1 افتراضياً
            embedUrl = `${VIDAPI_BASE}/tv/${id}/1/1?autoplay=1`;
        }

        // إنشاء الـ iframe
        iframeWrapper.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`;
        iframeWrapper.classList.remove('hidden');
        playBtn.classList.add('hidden');
    };

    // إظهار النافذة
    document.getElementById('detailsModal').classList.remove('hidden');
    document.getElementById('detailsModal').classList.add('flex');
    document.body.style.overflow = 'hidden';
};

window.closeModal = () => {
    document.getElementById('detailsModal').classList.add('hidden');
    document.getElementById('detailsModal').classList.remove('flex');
    document.body.style.overflow = 'auto';
    // إيقاف الفيديو عند الإغلاق
    document.getElementById('iframeWrapper').innerHTML = ''; 
};

// 4. نظام التنقل (Bottom Navigation)
window.switchTab = (tabName) => {
    // إخفاء كل الشاشات
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });
    
    // إظهار الشاشة المطلوبة
    document.getElementById(tabName + 'View').classList.remove('hidden');
    document.getElementById(tabName + 'View').classList.add('block');
    
    // تلوين الزر النشط في القائمة السفلية
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === tabName) {
            btn.classList.replace('text-gray-500', 'text-white');
        } else {
            btn.classList.replace('text-white', 'text-gray-500');
        }
    });

    // التمرير للأعلى
    window.scrollTo(0,0);
};

// 5. نظام البحث اللحظي
document.getElementById('searchInput').addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if(query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=ar&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        resultsContainer.innerHTML = '';
        data.results.forEach(item => {
            if(!item.poster_path || item.media_type === 'person') return;
            const title = item.title || item.name;
            const itemData = encodeURIComponent(JSON.stringify(item));
            
            resultsContainer.innerHTML += `
                <div class="cursor-pointer group" onclick="openDetails('${itemData}')">
                    <div class="relative rounded-md overflow-hidden aspect-[2/3] bg-gray-800">
                        <img src="${IMG_URL + item.poster_path}" class="w-full h-full object-cover transition group-hover:scale-110" alt="${title}">
                    </div>
                    <h3 class="text-xs text-center mt-2 text-gray-300 truncate group-hover:text-white">${title}</h3>
                </div>
            `;
        });
    } catch(err) { console.error('Search error', err); }
});

// 6. نافذة الطلبات (Request)
window.openRequestModal = () => {
    document.getElementById('requestModal').classList.remove('hidden');
    document.getElementById('requestModal').classList.add('flex');
};
