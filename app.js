document.addEventListener('DOMContentLoaded', () => {
    
    // 1. تهيئة الشريط المتحرك (Hero Slider)
    const heroWrapper = document.getElementById('heroWrapper');
    heroData.forEach(slide => {
        heroWrapper.innerHTML += `
            <div class="swiper-slide relative">
                <div class="absolute inset-0 bg-gradient-to-t from-darker via-darker/60 to-transparent z-10"></div>
                <img src="${slide.image}" class="w-full h-full object-cover object-top" alt="${slide.title}">
                <div class="absolute bottom-10 right-10 z-20 max-w-lg">
                    <span class="bg-primary px-3 py-1 rounded-full text-sm font-bold">${slide.type}</span>
                    <h1 class="text-4xl md:text-6xl font-bold text-white mt-4 drop-shadow-lg">${slide.title}</h1>
                    <p class="text-gray-300 mt-4 text-lg drop-shadow-md">${slide.description}</p>
                    <div class="mt-6 flex gap-4">
                        <button class="bg-white text-black px-8 py-3 rounded-md font-bold hover:bg-gray-200 transition flex items-center gap-2">
                            <i class="fa-solid fa-play"></i> تشغيل
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    // تشغيل مكتبة Swiper
    new Swiper('.heroSwiper', {
        loop: true,
        autoplay: { delay: 5000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    });

    // 2. دوال المفضلة والمشاهدة لاحقاً (بواسطة localStorage)
    const toggleAction = (id, actionType, buttonEl) => {
        let storage = JSON.parse(localStorage.getItem(actionType)) || [];
        if (storage.includes(id)) {
            storage = storage.filter(itemId => itemId !== id);
            buttonEl.classList.remove(actionType === 'fav' ? 'text-yellow-400' : 'text-blue-400');
        } else {
            storage.push(id);
            buttonEl.classList.add(actionType === 'fav' ? 'text-yellow-400' : 'text-blue-400');
        }
        localStorage.setItem(actionType, JSON.stringify(storage));
    };

    const isSaved = (id, actionType) => {
        const storage = JSON.parse(localStorage.getItem(actionType)) || [];
        return storage.includes(id) ? (actionType === 'fav' ? 'text-yellow-400' : 'text-blue-400') : 'text-white/70';
    };

    // 3. دالة بناء كروت المحتوى
    const renderCards = (dataArray, containerId) => {
        const container = document.getElementById(containerId);
        dataArray.forEach(item => {
            container.innerHTML += `
                <div class="min-w-[150px] md:min-w-[200px] snap-start relative group cursor-pointer">
                    <div class="relative overflow-hidden rounded-xl aspect-[2/3] shadow-lg">
                        <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
                        
                        <!-- أزرار التفاعل التي تظهر عند تمرير الماوس -->
                        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button onclick="toggleCardAction(${item.id}, 'fav', this)" class="hover:scale-125 transition ${isSaved(item.id, 'fav')}">
                                <i class="fa-solid fa-star text-2xl drop-shadow-md"></i>
                            </button>
                            <button onclick="toggleCardAction(${item.id}, 'watchLater', this)" class="hover:scale-125 transition ${isSaved(item.id, 'watchLater')}">
                                <i class="fa-solid fa-bookmark text-2xl drop-shadow-md"></i>
                            </button>
                        </div>
                    </div>
                    <div class="mt-2">
                        <h3 class="text-white font-semibold truncate text-sm md:text-base">${item.title}</h3>
                        <div class="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <i class="fa-solid fa-star text-yellow-500"></i> ${item.rating}
                        </div>
                    </div>
                </div>
            `;
        });
    };

    // حقن البيانات في الأقسام
    renderCards(contentData.movies, 'moviesContainer');
    renderCards(contentData.series, 'seriesContainer');
    renderCards(contentData.kdrama, 'kdramaContainer');

    // إتاحة دالة التفاعل للـ HTML
    window.toggleCardAction = toggleAction;

    // تغيير لون القائمة العلوية عند التمرير
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (window.scrollY > 50) {
            nav.classList.add('bg-darker', 'shadow-md');
            nav.classList.remove('bg-transparent');
        } else {
            nav.classList.remove('bg-darker', 'shadow-md');
            nav.classList.add('bg-transparent');
        }
    });
});
