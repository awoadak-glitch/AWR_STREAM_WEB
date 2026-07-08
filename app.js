document.addEventListener('DOMContentLoaded', () => {
    
    // 1. بناء الهيرو (الشريط العلوي)
    const heroWrapper = document.getElementById('heroWrapper');
    DATA_API.hero.forEach(item => {
        heroWrapper.innerHTML += `
            <div class="swiper-slide relative bg-cardBg">
                <div class="absolute inset-0 bg-gradient-to-r from-darkBg via-darkBg/60 to-transparent z-10"></div>
                <img src="${item.banner}" class="w-full h-full object-cover object-top opacity-70" alt="${item.title}" onerror="this.src='${FALLBACK_IMAGE}'">
                <div class="absolute bottom-[15%] md:bottom-[30%] right-[5%] z-20 max-w-2xl px-4 md:px-0">
                    <div class="flex gap-2 mb-3">
                        ${item.tags.map(tag => `<span class="bg-black/50 backdrop-blur-md border border-gray-600 px-3 py-1 rounded-sm text-xs font-bold text-gray-200">${tag}</span>`).join('')}
                    </div>
                    ${item.logo ? `<img src="${item.logo}" class="max-h-24 md:max-h-32 mb-4 object-contain" alt="${item.title}">` : `<h1 class="text-4xl md:text-7xl font-black text-white mb-4 shadow-black drop-shadow-2xl">${item.title}</h1>`}
                    <p class="text-gray-300 text-sm md:text-lg mb-6 line-clamp-2 md:line-clamp-3 text-shadow">${item.desc}</p>
                    <div class="flex gap-3">
                        <button class="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded flex items-center gap-2 font-bold hover:bg-gray-200 transition">
                            <i class="fa-solid fa-play"></i> تشغيل
                        </button>
                        <button class="bg-gray-500/50 backdrop-blur-md text-white px-6 md:px-8 py-2 md:py-3 rounded flex items-center gap-2 font-bold hover:bg-gray-500/70 transition">
                            <i class="fa-solid fa-circle-info"></i> معلومات
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    new Swiper('.heroSwiper', {
        loop: true,
        autoplay: { delay: 6000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        effect: 'fade', // انتقال سينمائي
    });

    // 2. دالة بناء كروت المحتوى في السلايدر
    const renderContent = (data, containerId) => {
        const container = document.getElementById(containerId);
        data.forEach(item => {
            // نخزن بيانات العنصر كـ String في الزر لفتح المودال
            const itemDataStr = encodeURIComponent(JSON.stringify(item));
            
            container.innerHTML += `
                <div class="swiper-slide w-[130px] md:w-[220px] group cursor-pointer" onclick="openModal('${itemDataStr}')">
                    <div class="relative overflow-hidden rounded-md aspect-[2/3] bg-cardBg transition duration-300 group-hover:scale-105 group-hover:z-10 group-hover:shadow-2xl group-hover:shadow-black">
                        <img src="${item.poster}" alt="${item.title}" class="w-full h-full object-cover" onerror="this.src='${FALLBACK_IMAGE}'">
                        <div class="absolute top-2 right-2 bg-black/70 backdrop-blur text-brand text-xs font-bold px-2 py-1 rounded">
                            ${item.rating} <i class="fa-solid fa-star"></i>
                        </div>
                        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                            <div class="w-full text-center">
                                <i class="fa-regular fa-circle-play text-4xl text-white hover:text-brand transition mb-2"></i>
                                <h3 class="text-white text-sm font-bold truncate">${item.title}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    };

    renderContent(DATA_API.trending, 'trendingContainer');
    renderContent(DATA_API.movies, 'moviesContainer');
    renderContent(DATA_API.series, 'seriesContainer');

    // إعداد سويبر المحتوى (Cards Slider)
    const swiperOptions = {
        slidesPerView: 'auto',
        spaceBetween: 10,
        freeMode: true,
        breakpoints: {
            768: { spaceBetween: 20 }
        }
    };
    document.querySelectorAll('.contentSwiper').forEach(el => new Swiper(el, swiperOptions));

    // 3. نظام النافذة المنبثقة (Modal)
    const modal = document.getElementById('detailsModal');
    const modalContent = document.getElementById('modalContent');
    
    window.openModal = (encodedData) => {
        const item = JSON.parse(decodeURIComponent(encodedData));
        
        modalContent.innerHTML = `
            <div class="relative h-[40vh] md:h-[50vh] w-full bg-black">
                <div class="absolute inset-0 bg-gradient-to-t from-cardBg via-transparent to-transparent z-10"></div>
                <img src="${item.poster}" class="w-full h-full object-cover opacity-50 blur-sm" alt="bg" onerror="this.src='${FALLBACK_IMAGE}'">
                <div class="absolute bottom-6 right-6 flex items-end gap-6 z-20">
                    <img src="${item.poster}" class="w-28 md:w-40 rounded-lg shadow-2xl border border-gray-700" alt="${item.title}" onerror="this.src='${FALLBACK_IMAGE}'">
                    <div class="pb-2">
                        <h2 class="text-3xl md:text-5xl font-bold text-white mb-2">${item.title}</h2>
                        <div class="flex gap-4 text-sm text-gray-300 font-bold">
                            <span class="text-green-500">${item.rating} إعجاب</span>
                            <span>${item.year}</span>
                            <span class="border border-gray-500 px-1 text-xs">HD</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="p-6 md:p-10 flex flex-col md:flex-row gap-8">
                <div class="md:w-2/3">
                    <div class="flex gap-4 mb-6">
                        <button class="bg-white text-black px-6 py-2 rounded font-bold hover:bg-gray-200 flex-1 md:flex-none text-center">
                            <i class="fa-solid fa-play mr-2"></i> تشغيل الآن
                        </button>
                        <button onclick="toggleList('${item.id}', this)" class="border border-gray-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:border-white transition group">
                            <i class="fa-solid fa-plus group-hover:scale-110 transition"></i>
                        </button>
                        <button class="border border-gray-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:border-white transition">
                            <i class="fa-regular fa-thumbs-up"></i>
                        </button>
                    </div>
                    <p class="text-gray-300 leading-relaxed text-lg">${item.desc}</p>
                </div>
                <div class="md:w-1/3 text-sm text-gray-400 space-y-2 border-t md:border-t-0 md:border-r border-gray-700 pt-4 md:pt-0 md:pr-6">
                    <p><span class="text-gray-500">التصنيف:</span> أكشن، دراما، تشويق</p>
                    <p><span class="text-gray-500">الجودة:</span> 4K Ultra HD</p>
                    <p><span class="text-gray-500">حالة التوفر:</span> متاح للتحميل</p>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
    };

    // إغلاق المودال
    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = 'auto';
    };

    document.querySelectorAll('.modal-close, .modal-bg').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // دالة محاكاة الإضافة للقائمة (لربطها بالباك إند لاحقاً)
    window.toggleList = (id, btn) => {
        const icon = btn.querySelector('i');
        if(icon.classList.contains('fa-plus')) {
            icon.classList.replace('fa-plus', 'fa-check');
            btn.classList.add('border-brand', 'text-brand');
            // هنا تضع كود إرسال الـ ID لقاعدة البيانات (Fetch/Axios)
        } else {
            icon.classList.replace('fa-check', 'fa-plus');
            btn.classList.remove('border-brand', 'text-brand');
        }
    };

    // تأثير لون شريط التنقل عند التمرير
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 20) {
            nav.classList.add('bg-darkBg');
            nav.classList.remove('bg-gradient-to-b', 'from-black/80', 'to-transparent');
        } else {
            nav.classList.remove('bg-darkBg');
            nav.classList.add('bg-gradient-to-b', 'from-black/80', 'to-transparent');
        }
    });
});
