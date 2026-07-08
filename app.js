document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const resultsDropdown = document.getElementById('resultsDropdown');
    
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // تنظيف المؤقت السابق (Debounce)
        clearTimeout(debounceTimer);

        if (query.length === 0) {
            resultsDropdown.classList.add('hidden');
            return;
        }

        // تأخير البحث بمقدار 300 ملي ثانية
        debounceTimer = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    function performSearch(query) {
        // فلترة البيانات بناءً على النص المدخل
        const results = mockData.filter(item => 
            item.title.toLowerCase().includes(query.toLowerCase())
        );

        renderResults(results, query);
    }

    function renderResults(results, query) {
        resultsDropdown.innerHTML = '';
        resultsDropdown.classList.remove('hidden');

        if (results.length > 0) {
            // إنشاء قائمة النتائج
            const listContainer = document.createElement('div');
            listContainer.className = 'max-h-96 overflow-y-auto p-2';

            results.forEach(item => {
                const resultItem = document.createElement('div');
                resultItem.className = 'flex items-center gap-4 p-3 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors border-b border-gray-800 last:border-0';
                
                resultItem.innerHTML = `
                    <img src="${item.image}" alt="${item.title}" class="w-12 h-16 object-cover rounded-md shadow-md">
                    <div class="flex-1 text-right">
                        <h4 class="text-white font-bold">${item.title}</h4>
                        <div class="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <span class="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">${item.type}</span>
                            <span>${item.year}</span>
                            <span>⭐ ${item.rating}</span>
                        </div>
                    </div>
                `;
                listContainer.appendChild(resultItem);
            });

            resultsDropdown.appendChild(listContainer);
        } else {
            // واجهة عدم وجود نتائج مع زر الطلب
            const notFoundContainer = document.createElement('div');
            notFoundContainer.className = 'p-8 text-center flex flex-col items-center justify-center';
            
            notFoundContainer.innerHTML = `
                <i class="fa-solid fa-magnifying-glass-minus text-4xl text-gray-500 mb-4"></i>
                <h3 class="text-xl font-bold text-white mb-2">لم نتمكن من العثور على نتائج</h3>
                <p class="text-gray-400 mb-6 text-center">يبدو أن "${query}" غير متوفر في مكتبتنا حالياً.</p>
                <button id="requestBtn" class="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-blue-600 text-white rounded-full font-bold transition-transform transform hover:scale-105 active:scale-95">
                    <i class="fa-solid fa-plus"></i>
                    اطلب إضافة هذا العمل
                </button>
            `;

            resultsDropdown.appendChild(notFoundContainer);

            // إضافة حدث النقر لزر الطلب
            document.getElementById('requestBtn').addEventListener('click', () => {
                alert(`تم تسجيل طلبك لإضافة: "${query}". (سنقوم بربطه بالـ Backend لاحقاً)`);
                searchInput.value = '';
                resultsDropdown.classList.add('hidden');
            });
        }
    }

    // إخفاء القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
            resultsDropdown.classList.add('hidden');
        }
    });
});
