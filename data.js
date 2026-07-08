// هنا قمنا بإضافة رابط صورة احتياطية (Fallback) وصور بجودة عالية
const DATA_API = {
    hero: [
        { id: 'h1', title: 'Oppenheimer', desc: 'قصة العالم الأمريكي جيه. روبرت أوبنهايمر ودوره في تطوير القنبلة الذرية.', banner: 'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBRoOoA0i.jpg', logo: 'https://image.tmdb.org/t/p/original/2HceAEXD4tJ8hA8eLpCgB25K1o.png', tags: ['فيلم', 'تاريخي', 'دراما'] },
        { id: 'h2', title: 'The Last of Us', desc: 'بعد عشرين عامًا من تدمير الحضارة الحديثة، يتم استئجار جويل لتهريب فتاة.', banner: 'https://image.tmdb.org/t/p/original/uDgy6hyPd82kRVGkA7zI13Esh7e.jpg', logo: '', tags: ['مسلسل', 'أكشن', 'بقاء'] }
    ],
    trending: [
        { id: 't1', title: 'Dune: Part Two', poster: 'https://image.tmdb.org/t/p/w500/8rpDcsfLJypbO6vtec8OobA3Ign.jpg', rating: '8.8', year: '2024', desc: 'يواصل بول أتريدس رحلته الأسطورية للانتقام من المتآمرين.' },
        { id: 't2', title: 'Shogun', poster: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WwU144PeO.jpg', rating: '9.2', year: '2024', desc: 'صدام الحضارات في اليابان الإقطاعية.' },
        { id: 't3', title: 'Invincible', poster: 'https://image.tmdb.org/t/p/w500/dMO1fX5iP3u2O228L9PEXg8o1Rz.jpg', rating: '8.7', year: '2023', desc: 'قصة بطل خارق مراهق يكتشف إرث والده.' },
        { id: 't4', title: 'Godzilla Minus One', poster: 'https://image.tmdb.org/t/p/w500/hkxxMIGaiCTmrEArK7J56JTKUlB.jpg', rating: '8.3', year: '2023', desc: 'اليابان ما بعد الحرب تواجه خطراً جديداً.' },
        { id: 't5', title: 'Solo Leveling', poster: 'https://image.tmdb.org/t/p/w500/1X6GqA5lVw6zZt7zYk6O7yN8L9n.jpg', rating: '8.5', year: '2024', desc: 'أضعف صياد في العالم يحصل على فرصة ثانية.' }
    ],
    movies: [
        { id: 'm1', title: 'John Wick: Chapter 4', poster: 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg', rating: '7.8', year: '2023', desc: 'يكتشف جون ويك طريقاً لهزيمة المجلس الأعلى.' },
        { id: 'm2', title: 'Interstellar', poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', rating: '8.6', year: '2014', desc: 'فريق من المستكشفين يسافرون عبر ثقب دودي في الفضاء.' },
        { id: 'm3', title: 'Joker', poster: 'https://image.tmdb.org/t/p/w500/udDclJoHjfPt8ClePt828102d.jpg', rating: '8.4', year: '2019', desc: 'قصة أصل أشهر شرير في مدينة غوثام.' },
        { id: 'm4', title: 'Spider-Man: Across the Spider-Verse', poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', rating: '8.4', year: '2023', desc: 'مايلز موراليس يعود في مغامرة جديدة عبر الأكوان.' }
    ],
    series: [
        { id: 's1', title: 'Breaking Bad', poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRFlj.jpg', rating: '9.5', year: '2008', desc: 'معلم كيمياء يتحول إلى طباخ ميثامفيتامين.' },
        { id: 's2', title: 'Peaky Blinders', poster: 'https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg', rating: '8.8', year: '2013', desc: 'عصابة خطيرة في برمنغهام بعد الحرب العالمية الأولى.' },
        { id: 's3', title: 'Dark', poster: 'https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg', rating: '8.7', year: '2017', desc: 'اختفاء طفلين في بلدة ألمانية يكشف أسراراً عائلية.' }
    ]
};

// صورة بديلة في حال فشل تحميل الصورة الأصلية
const FALLBACK_IMAGE = 'https://via.placeholder.com/500x750/1f1f1f/ffffff?text=AWR+Stream';
