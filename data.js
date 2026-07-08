// بيانات الشريط المتحرك (أهم التحديثات)
const heroData = [
    { id: 101, title: 'Dune: Part Two', description: 'رحلة أسطورية في قلب الصحراء.', image: 'https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vtec8OobA3Ign.jpg', type: 'فيلم' },
    { id: 102, title: 'Shogun', description: 'ملحمة تاريخية في اليابان الإقطاعية.', image: 'https://image.tmdb.org/t/p/original/5zmiBoMzeeVdQ62no55JOJMY4g8.jpg', type: 'مسلسل' },
    { id: 103, title: 'Jujutsu Kaisen', description: 'معارك طاحنة ضد اللعنات.', image: 'https://image.tmdb.org/t/p/original/hfbaQikZk9b7K8Q4Z5ZJ6Tz8vj0.jpg', type: 'أنمي' }
];

// بيانات الأقسام (يمكنك إضافة المزيد لاحقاً)
const contentData = {
    movies: [
        { id: 1, title: 'Inception', rating: '8.8', image: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
        { id: 2, title: 'Interstellar', rating: '8.6', image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
        { id: 3, title: 'The Dark Knight', rating: '9.0', image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
        { id: 4, title: 'Avatar 2', rating: '7.6', image: 'https://image.tmdb.org/t/p/w500/t6HIqrNDIGGLt3NdwNDh2gE4L66.jpg' },
        { id: 5, title: 'Oppenheimer', rating: '8.4', image: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' }
    ],
    series: [
        { id: 6, title: 'Breaking Bad', rating: '9.5', image: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRFlj.jpg' },
        { id: 7, title: 'Stranger Things', rating: '8.7', image: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8OSqwW9A5.jpg' },
        { id: 8, title: 'Game of Thrones', rating: '9.2', image: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg' },
        { id: 9, title: 'The Boys', rating: '8.7', image: 'https://image.tmdb.org/t/p/w500/mY7SeH4HFFxW1hiI6cWuwCRKptN.jpg' }
    ],
    kdrama: [
        { id: 10, title: 'Squid Game', rating: '8.0', image: 'https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg' },
        { id: 11, title: 'Vincenzo', rating: '8.5', image: 'https://image.tmdb.org/t/p/w500/dvXJgEDQXhL9Ouot2WkBHpQiHGd.jpg' },
        { id: 12, title: 'All of Us Are Dead', rating: '8.0', image: 'https://image.tmdb.org/t/p/w500/pTEFqAjLd5YBg2IoOBZKo41hWLA.jpg' }
    ]
};
