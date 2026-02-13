
// Voice of Customer Analysis Module
// Processes qualitative feedback for insights

const STOP_WORDS = new Set([
    'dan', 'yg', 'yang', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'pada', 'adalah',
    'sebagai', 'juga', 'dengan', 'ada', 'tidak', 'tak', 'akan', 'sudah', 'atau', 'tetapi',
    'tapi', 'namun', 'karena', 'sebab', 'bisa', 'dapat', 'oleh', 'saat', 'ketika', 'maka',
    'kalau', 'jika', 'bila', 'sehingga', 'agar', 'supaya', 'lalu', 'kmudian', 'sedangkan',
    'sementara', 'sambil', 'serta', 'bahwa', 'apakah', 'siapa', 'apa', 'dimana', 'kapan',
    'kenapa', 'mengapa', 'bagaimana', 'brp', 'berapa', 'hanya', 'saja', 'lagi', 'masih',
    'pernah', 'selalu', 'sering', 'jarang', 'kadang', 'biasanya', 'memang', 'tentu', 'pasti',
    'mungkin', 'barangkali', 'entah', 'jangan', 'bukan', 'belum', 'harus', 'mesti', 'perlu',
    'wajib', 'boleh', 'dilarang', 'terhadap', 'tentang', 'seperti', 'bagaikan', 'laksana',
    'daripada', 'sekadar', 'cuma', 'hampir', 'nyaris', 'sangat', 'sekali', 'amat', 'terlalu',
    'kurang', 'lebih', 'paling', 'cukup', 'sedikit', 'banyak', 'semua', 'segala', 'seluruh',
    'tiap', 'setiap', 'masing-masing', 'antara', 'lain', 'salah', 'satu', 'beberapa', 'para',
    'aku', 'saya', 'kamu', 'anda', 'dia', 'beliau', 'kami', 'kita', 'mereka', 'kalian',
    'si', 'sang', 'nya', 'mu', 'ku', 'kah', 'pun', 'lah', 'tah', 'dong', 'kok', 'sih',
    'deh', 'kan', 'ya', 'yuk', 'mari', 'halo', 'hai', 'oi', 'mas', 'mba', 'pak', 'bu',
    'kak', 'bang', 'dek', 'toko', 'eiger', 'store', 'outlet', 'pelayanan', 'produk', 'barang',
    'tempat', 'untuk', 'nya', 'kalo', 'gak', 'gk', 'tdk', 'tp', 'krn', 'jd', 'bgt', 'banget',
    'aja', 'ad', 'org', 'utk', 'dgn', 'sy', 'sm', 'sdh', 'udh', 'blm', 'sbg', 'dr', 'dlm',
    'kpd', 'tsb', 'dll', 'dsb', 'dst', 'yg', 'klo', 'karna', 'ma', 'ama', 'sama'
]);

const POSITIVE_WORDS = new Set([
    'bagus', 'baik', 'ramah', 'cepat', 'bersih', 'nyaman', 'puas', 'mantap', 'keren',
    'suka', 'senang', 'membantu', 'informatif', 'lengkap', 'rapi', 'wangi', 'dingin',
    'sejuk', 'terbaik', 'professional', 'sopan', 'murah', 'promo', 'diskon', 'terjangkau',
    'menarik', 'ok', 'oke', 'sip', 'jos', 'top', 'asik', 'seru', 'betah', 'recomended',
    'recommended', 'kualitas', 'high', 'premium', 'good', 'nice', 'great', 'excellent',
    'perfect', 'love', 'like', 'best', 'super', 'juara', 'hebat', 'tolong'
]);

const NEGATIVE_WORDS = new Set([
    'jelek', 'buruk', 'kasar', 'lama', 'lambat', 'kotor', 'bau', 'panas', 'gerah', 'sempit',
    'berantakan', 'mahal', 'kurang', 'kecewa', 'kesal', 'marah', 'benci', 'rugi', 'parah',
    'payah', 'mengecewakan', 'ribet', 'susah', 'sulit', 'bingung', 'pusing', 'berisik',
    'gaduh', 'sepi', 'kosong', 'habis', 'rusak', 'cacat', 'bosen', 'bosan', 'antri',
    'antre', 'lelet', 'lemot', 'judes', 'jutek', 'sinis', 'cuek', 'acuh', 'sombong',
    'angkuh', 'pelit', 'curang', 'bohong', 'palsu', 'kw', 'tiruan', 'jelek', 'butut',
    'usang', 'kuno', 'jadul', 'norak', 'kampungan', 'ndeso', 'gagal', 'error', 'bug',
    'masalah', 'problem', 'komplain', 'keluhan', 'protes', 'kritik', 'saran', 'masukan',
    'tolong', 'mohon', 'harap', 'perbaiki', 'tingkatkan', 'ubah', 'ganti'
]);

// Helper to normalize and tokenize text
function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)             // Split by whitespace
        .filter(t => t.length > 2); // Filter short words
}

function analyzeFeedback(qualitativeList) {
    if (!qualitativeList || !Array.isArray(qualitativeList)) return { wordCloud: [], sentiment: {}, themes: [] };

    let totalWords = 0;
    let wordCounts = {};
    let sentimentScore = 0; // >0 positive, <0 negative
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    let themes = {
        'Service': { keywords: ['pelayanan', 'karyawan', 'staff', 'kasir', 'sopan', 'ramah', 'judes', 'senyum', 'salam'], count: 0, sentiment: 0 },
        'Product': { keywords: ['produk', 'barang', 'stok', 'ukuran', 'size', 'warna', 'model', 'kualitas', 'bahan'], count: 0, sentiment: 0 },
        'Ambience': { keywords: ['suasana', 'tempat', 'ac', 'dingin', 'panas', 'musik', 'lagu', 'bersih', 'kotator', 'rapi'], count: 0, sentiment: 0 },
        'Process': { keywords: ['antri', 'bayar', 'transaksi', 'kasir', 'lama', 'cepat', 'ribet', 'mudah'], count: 0, sentiment: 0 }
    };

    qualitativeList.forEach(feedback => {
        if (!feedback) return;

        let tokens = tokenize(feedback);
        let feedbackSentiment = 0;
        let mentionedThemes = new Set();

        tokens.forEach(word => {
            // Word Cloud
            if (!STOP_WORDS.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
                totalWords++;
            }

            // Sentiment
            if (POSITIVE_WORDS.has(word)) {
                feedbackSentiment++;
                sentimentScore++;
            } else if (NEGATIVE_WORDS.has(word)) {
                feedbackSentiment--;
                sentimentScore--;
            }

            // Themes
            for (let theme in themes) {
                if (themes[theme].keywords.some(k => word.includes(k))) {
                    mentionedThemes.add(theme);
                }
            }
        });

        // Theme Sentiment Attribution
        mentionedThemes.forEach(theme => {
            themes[theme].count++;
            themes[theme].sentiment += feedbackSentiment;
        });

        // Overall Sentiment Classification
        if (feedbackSentiment > 0) positiveCount++;
        else if (feedbackSentiment < 0) negativeCount++;
        else neutralCount++;
    });

    // Formatting Word Cloud
    let sortedWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([text, size]) => ({ text, size }));

    // Formatting Themes
    let sortedThemes = Object.entries(themes)
        .map(([name, data]) => ({ name, count: data.count, sentiment: data.sentiment }))
        .sort((a, b) => b.count - a.count);

    return {
        wordCloud: sortedWords,
        sentiment: { positive: positiveCount, negative: negativeCount, neutral: neutralCount, total: qualitativeList.length },
        themes: sortedThemes
    };
}

module.exports = { analyzeFeedback };
