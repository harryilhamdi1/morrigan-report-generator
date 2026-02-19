// Voice of Customer Analysis Module
// Processes qualitative feedback for insights
// v2.1 - Negation & Imperative Aware Sentiment

const STOP_WORDS = new Set([
    'dan', 'yg', 'yang', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'pada', 'adalah',
    'sebagai', 'juga', 'dengan', 'ada', 'akan', 'sudah', 'atau',
    'oleh', 'saat', 'ketika', 'maka',
    'kalau', 'jika', 'bila', 'sehingga', 'agar', 'supaya', 'lalu', 'kmudian', 'sedangkan',
    'sementara', 'sambil', 'serta', 'bahwa', 'apakah', 'siapa', 'apa', 'dimana', 'kapan',
    'kenapa', 'mengapa', 'bagaimana', 'brp', 'berapa', 'hanya', 'saja', 'lagi', 'masih',
    'pernah', 'selalu', 'sering', 'jarang', 'kadang', 'biasanya', 'memang', 'tentu', 'pasti',
    'mungkin', 'barangkali', 'entah',
    'wajib', 'boleh', 'dilarang', 'terhadap', 'tentang', 'seperti', 'bagaikan', 'laksana',
    'daripada', 'sekadar', 'cuma', 'hampir', 'nyaris', 'sangat', 'sekali', 'amat',
    'lebih', 'paling', 'cukup', 'sedikit', 'banyak', 'semua', 'segala', 'seluruh',
    'tiap', 'setiap', 'masing-masing', 'antara', 'lain', 'salah', 'satu', 'beberapa', 'para',
    'aku', 'saya', 'kamu', 'anda', 'dia', 'beliau', 'kami', 'kita', 'mereka', 'kalian',
    'si', 'sang', 'nya', 'mu', 'ku', 'kah', 'pun', 'lah', 'tah', 'dong', 'kok', 'sih',
    'deh', 'kan', 'ya', 'yuk', 'mari', 'halo', 'hai', 'oi', 'mas', 'mba', 'pak', 'bu',
    'kak', 'bang', 'dek', 'toko', 'eiger', 'store', 'outlet',
    'nya', 'kalo', 'gk', 'tp', 'krn', 'jd', 'bgt', 'banget',
    'aja', 'ad', 'org', 'utk', 'dgn', 'sy', 'sm', 'sdh', 'udh', 'blm', 'sbg', 'dr', 'dlm',
    'kpd', 'tsb', 'dll', 'dsb', 'dst', 'yg', 'klo', 'karna', 'ma', 'ama', 'sama'
]);

// NOTE: "kurang", "tidak", "belum", "bukan", "jangan", "tak", "gak" are NOT stop words.
// They are NEGATION words handled by the negation-aware engine below.

// Negation words: these FLIP the sentiment of the NEXT sentiment-bearing word
const NEGATION_WORDS = new Set([
    'tidak', 'tak', 'bukan', 'belum', 'jangan', 'kurang', 'gak', 'gk', 'tdk', 'blm', 'ga', 'nggak', 'enggak'
]);

// Contrast conjunctions: words that signal the REAL sentiment comes AFTER them
const CONTRAST_WORDS = new Set([
    'namun', 'tetapi', 'tapi', 'tp', 'sayangnya', 'sayang', 'cuma', 'hanya',
    'however', 'but', 'walaupun', 'meskipun', 'walau', 'meski', 'kendati', 'sedangkan', 'melainkan'
]);

// Imperative/Suggestion words: imply the positive trait is MISSING.
// "Harus rapi" -> "Rapi" is desired, so current state is NOT rapi (Negative).
const IMPERATIVE_WORDS = new Set([
    'harus', 'kudu', 'wajib', 'mesti', 'perlu', 'butuh', 'seharusnya', 'semestinya', 'sebaiknya',
    'agar', 'supaya', 'mohon', 'tolong', 'minta', 'harap', 'hendaknya', 'biar', 'bisa', 'dapat'
]);

const POSITIVE_WORDS = new Set([
    'bagus', 'baik', 'ramah', 'cepat', 'bersih', 'nyaman', 'puas', 'mantap', 'keren',
    'suka', 'senang', 'membantu', 'informatif', 'lengkap', 'rapi', 'wangi', 'dingin',
    'sejuk', 'terbaik', 'professional', 'sopan', 'murah', 'promo', 'diskon', 'terjangkau',
    'menarik', 'ok', 'oke', 'sip', 'jos', 'top', 'asik', 'seru', 'betah', 'recomended',
    'recommended', 'kualitas', 'high', 'premium', 'good', 'nice', 'great', 'excellent',
    'perfect', 'love', 'like', 'best', 'super', 'juara', 'hebat',
    'menawarkan', 'memberikan', 'sesuai', 'antusias', 'sigap', 'tanggap', 'responsif',
    'memuaskan', 'terbantu', 'terkesan', 'luar', 'biasa', 'proaktif', 'inisiatif',
    'solutif', 'interaktif', 'komunikatif', 'cekatan', 'gesit', 'available'
]);

const NEGATIVE_WORDS = new Set([
    'jelek', 'buruk', 'kasar', 'lama', 'lambat', 'kotor', 'bau', 'panas', 'gerah', 'sempit',
    'berantakan', 'mahal', 'kecewa', 'kesal', 'marah', 'benci', 'rugi', 'parah',
    'payah', 'mengecewakan', 'ribet', 'susah', 'sulit', 'bingung', 'pusing', 'berisik',
    'gaduh', 'sepi', 'kosong', 'habis', 'rusak', 'cacat', 'bosen', 'bosan', 'antri',
    'antre', 'lelet', 'lemot', 'judes', 'jutek', 'sinis', 'cuek', 'acuh', 'sombong',
    'angkuh', 'pelit', 'curang', 'bohong', 'palsu', 'tiruan', 'butut',
    'usang', 'kuno', 'jadul', 'norak', 'kampungan', 'gagal', 'error',
    'masalah', 'problem', 'komplain', 'keluhan', 'protes',
    'kusam', 'lecet', 'retak', 'bocor', 'tergeletak', 'berserakan', 'kumuh',
    'mengecewakan', 'menjengkelkan', 'mengganggu', 'membingungkan',
    'mati', 'padam', 'off', 'berbeda', 'beda', 'miss', 'salah', 'keliru', 'skp',
    'handphone', 'hp', 'bermain', 'ponsel'
]);

// Positive PHRASES (multi-word patterns that are clearly positive)
const POSITIVE_PHRASES = [
    'sangat ramah', 'sangat membantu', 'sangat puas', 'sangat nyaman', 'sangat bersih',
    'sangat bagus', 'sangat baik', 'sangat informatif', 'sangat sopan', 'sangat lengkap',
    'luar biasa', 'pelayanan baik', 'pelayanan bagus', 'pelayanan ramah',
    'sangat memuaskan', 'sangat terbantu', 'sangat keren', 'sangat mantap',
    'recommended', 'recomended', 'highly recommended'
];

// Critical NEGATIVE phrases (multi-word patterns that are clearly negative)
// Each pattern scores as -2 (strong negative signal)
const NEGATIVE_PHRASES = [
    'kurang bersih', 'kurang ramah', 'kurang sopan', 'kurang lengkap', 'kurang rapi',
    'kurang memahami', 'kurang paham', 'kurang menjelaskan', 'kurang inisiatif', 'kurang berinisiatif',
    'kurang informatif', 'kurang membantu', 'kurang nyaman', 'kurang puas', 'kurang sigap',
    'kurang tanggap', 'kurang responsif', 'kurang cepat', 'kurang professional',
    'kurang proaktif', 'kurang interaktif', 'kurang komunikatif', 'kurang senyum',
    'tidak ramah', 'tidak sopan', 'tidak bersih', 'tidak rapi', 'tidak membantu',
    'tidak menjelaskan', 'tidak informatif', 'tidak nyaman', 'tidak puas', 'tidak sesuai',
    'tidak menawarkan', 'tidak aktif', 'tidak menyapa', 'tidak salam',
    'belum bersih', 'belum rapi', 'belum lengkap', 'belum memadai',
    'perlu ditingkatkan', 'perlu diperbaiki', 'perlu perbaikan', 'perlu peningkatan',
    'harus ditingkatkan', 'harus diperbaiki', 'harus perbaikan', 'bisa ditingkatkan',
    'hal yang perlu', 'yang perlu ditingkatkan', 'yang harus diperbaiki',
    'masih perlu', 'masih kurang', 'lebih ditingkatkan', 'bisa untuk ditingkatkan',
    'tidak menjelaskan apapun',
    'harus bertanya', 'harus tanya dulu', 'harus minta', 'tanya dulu',
    'kurang enak dipandang', 'kurang enak', 'cukup ramai',
    'berkesan kurang', 'terlihat kusam', 'terlihat kotor',
    'stok barang yang tergeletak', 'barang tergeletak', 'stok tergeletak',
    'product knowledge', 'tv mati', 'keadaan mati', 'beda nama', 'berbeda dengan',
    'nama berbeda', 'tidak menggunakan seragam', 'tidak pakai seragam', 'tidak sesuai sop',
    'memainkan handphone', 'bermain hp', 'lihat hp', 'menatap hp', 'pacit hp', 'main hp',
    'main handphone', 'pegang hp', 'sibuk hp'
];

// Helper to normalize and tokenize text
function tokenize(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .split(/\s+/)             // Split by whitespace
        .filter(t => t.length > 1); // Filter single-char words (lowered from >2 to catch "ac" etc.)
}

/**
 * Advanced Sentiment Scoring Engine
 */
// --- NAIVE BAYES CLASSIFIER ---
class NaiveBayesClassifier {
    constructor() {
        this.wordCounts = { positive: {}, negative: {}, neutral: {} };
        this.classCounts = { positive: 0, negative: 0, neutral: 0 };
        this.vocab = new Set();
        this.vocabSize = 0;
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    }

    train(dataset) {
        dataset.forEach(item => {
            const tokens = this.tokenize(item.text);
            const sentiment = item.label;

            if (!this.classCounts[sentiment]) this.classCounts[sentiment] = 0;
            this.classCounts[sentiment]++;

            tokens.forEach(token => {
                this.vocab.add(token);
                if (!this.wordCounts[sentiment][token]) this.wordCounts[sentiment][token] = 0;
                this.wordCounts[sentiment][token]++;
            });
        });
        this.vocabSize = this.vocab.size;
    }

    classify(text) {
        const tokens = this.tokenize(text);
        const sentiments = ['positive', 'negative', 'neutral'];
        const scores = {};
        const totalDocs = this.classCounts.positive + this.classCounts.negative + (this.classCounts.neutral || 0);

        sentiments.forEach(sentiment => {
            const classCount = this.classCounts[sentiment] || 0;
            // P(Class)
            let score = Math.log((classCount + 1) / (totalDocs + sentiments.length));

            // P(Word|Class)
            const wordMap = this.wordCounts[sentiment] || {};
            const totalWordsInClass = Object.values(wordMap).reduce((a, b) => a + b, 0);

            tokens.forEach(token => {
                const count = wordMap[token] || 0;
                // Laplace Smoothing (+1)
                score += Math.log((count + 1) / (totalWordsInClass + this.vocabSize));
            });
            scores[sentiment] = score;
        });

        // Convert Log Odds to pseudo-probability (not exact, but comparable)
        // We just need to know which is higher and by how much
        return scores;
    }
}

// Load Training Data
const trainingData = require('../config/sentiment_training.js');
const classifier = new NaiveBayesClassifier();
classifier.train(trainingData);

// --- HYBRID ANALYSIS (ML + RULES) ---
function analyzeSingle(text) {
    if (!text || typeof text !== 'string') return { sentiment: 'neutral', score: 0 };

    const lowerText = text.toLowerCase();

    // 1. Critical Rule Overrides (Instant Win)
    if (lowerText.includes('tidak') && (lowerText.includes('member') || lowerText.includes('menanyakan') || lowerText.includes('konfirmasi'))) {
        return { sentiment: 'negative', score: -5, method: 'Rule (Compliance)' };
    }

    // 2. ML Classification
    const mlScores = classifier.classify(text);

    // Find best label
    let bestSentiment = 'neutral';
    let maxScore = -Infinity;
    for (const label in mlScores) {
        if (mlScores[label] > maxScore) {
            maxScore = mlScores[label];
            bestSentiment = label;
        }
    }

    const sortedScores = Object.values(mlScores).sort((a, b) => b - a);
    const confidence = sortedScores[0] - sortedScores[1];

    // 3. Rule-Based Supporting Signals (Classic)
    let ruleScore = 0;
    const tokens = classifier.tokenize(text);
    tokens.forEach(w => {
        if (POSITIVE_WORDS.has(w)) ruleScore++;
        if (NEGATIVE_WORDS.has(w)) ruleScore--;
    });

    // 4. Final Decision
    let finalSentiment = bestSentiment;

    // Low confidence ML fallback to rules
    if (confidence < 0.5 && bestSentiment !== 'neutral') {
        if (ruleScore > 0) finalSentiment = 'positive';
        else if (ruleScore < 0) finalSentiment = 'negative';
        else finalSentiment = 'neutral';
    }

    // specific phrase overrides from old logic
    POSITIVE_PHRASES.forEach(p => { if (lowerText.includes(p)) finalSentiment = 'positive'; });
    NEGATIVE_PHRASES.forEach(p => { if (lowerText.includes(p)) finalSentiment = 'negative'; });

    return {
        sentiment: finalSentiment,
        mlScores,
        confidence,
        netScore: ruleScore
    };
}


function analyzeFeedback(qualitativeList) {
    if (!qualitativeList || !Array.isArray(qualitativeList)) return { wordCloud: [], sentiment: {}, themes: [] };

    let totalWords = 0;
    let wordCounts = {};
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    let themes = {
        'Service': { keywords: ['pelayanan', 'karyawan', 'staff', 'kasir', 'sopan', 'ramah', 'judes', 'senyum', 'salam', 'trainee', 'retail', 'assistant', 'petugas'], count: 0, sentiment: 0, wordCounts: {} },
        'Product': { keywords: ['produk', 'barang', 'stok', 'ukuran', 'size', 'warna', 'model', 'kualitas', 'bahan', 'product', 'knowledge'], count: 0, sentiment: 0, wordCounts: {} },
        'Ambience': { keywords: ['suasana', 'tempat', 'dingin', 'panas', 'musik', 'lagu', 'bersih', 'kotor', 'rapi', 'toilet', 'fitting', 'lantai', 'kebersihan', 'kusam'], count: 0, sentiment: 0, wordCounts: {} },
        'Process': { keywords: ['antri', 'bayar', 'transaksi', 'kasir', 'lama', 'cepat', 'ribet', 'mudah', 'member', 'struk', 'registrasi'], count: 0, sentiment: 0, wordCounts: {} }
    };

    qualitativeList.forEach(feedback => {
        if (!feedback) return;

        const tokens = classifier.tokenize(feedback);
        const result = analyzeSingle(feedback);

        let mentionedThemes = new Set();
        let validWords = [];

        tokens.forEach(word => {
            // Word Cloud (exclude negation words and stop words)
            if (!STOP_WORDS.has(word) && !NEGATION_WORDS.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
                totalWords++;
                validWords.push(word);
            }

            // Themes
            for (let theme in themes) {
                if (themes[theme].keywords.some(k => word.includes(k))) {
                    mentionedThemes.add(theme);
                }
            }
        });

        // Theme Sentiment & Word Attribution
        mentionedThemes.forEach(theme => {
            themes[theme].count++;
            // Map 'positive' to +1, 'negative' to -1, 'neutral' to 0
            let sentimentVal = 0;
            if (result.sentiment === 'positive') sentimentVal = 1;
            else if (result.sentiment === 'negative') sentimentVal = -1;

            themes[theme].sentiment += sentimentVal;
            validWords.forEach(w => {
                themes[theme].wordCounts[w] = (themes[theme].wordCounts[w] || 0) + 1;
            });
        });

        // Overall Sentiment Classification
        if (result.sentiment === 'positive') positiveCount++;
        else if (result.sentiment === 'negative') negativeCount++;
        else neutralCount++;
    });

    // Formatting Word Cloud
    let sortedWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([text, size]) => ({ text, size }));

    // Formatting Themes
    let sortedThemes = Object.entries(themes)
        .map(([name, data]) => {
            const topWords = Object.entries(data.wordCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([t, c]) => ({ text: t, count: c }));

            return {
                name,
                count: data.count,
                sentiment: data.sentiment,
                topWords: topWords
            };
        })
        .sort((a, b) => b.count - a.count);

    return {
        wordCloud: sortedWords,
        sentiment: { positive: positiveCount, negative: negativeCount, neutral: neutralCount, total: qualitativeList.length },
        themes: sortedThemes
    };
}

// Classify a single text string for sentiment and primary theme
function classifySingle(text) {
    if (!text || typeof text !== 'string') return { sentiment: 'neutral', themes: [] };

    const tokens = classifier.tokenize(text);
    const result = analyzeSingle(text);
    const detectedThemes = new Set();

    const themes = {
        'Service': ['pelayanan', 'karyawan', 'staff', 'kasir', 'sopan', 'ramah', 'judes', 'senyum', 'salam', 'retail', 'assistant', 'trainee', 'petugas'],
        'Product': ['produk', 'barang', 'stok', 'ukuran', 'size', 'warna', 'model', 'kualitas', 'bahan', 'product', 'knowledge'],
        'Ambience': ['suasana', 'tempat', 'dingin', 'panas', 'musik', 'lagu', 'bersih', 'kotor', 'rapi', 'toilet', 'fitting', 'lantai', 'kebersihan', 'kusam'],
        'Process': ['antri', 'bayar', 'transaksi', 'kasir', 'lama', 'cepat', 'ribet', 'mudah', 'member', 'struk', 'registrasi']
    };

    tokens.forEach(word => {
        for (const [theme, keyws] of Object.entries(themes)) {
            if (keyws.some(k => word.includes(k))) detectedThemes.add(theme);
        }
    });

    return {
        ...result,
        themes: Array.from(detectedThemes)
    };
}

/*
 * Generates natural language insights from feedback data.
 * @param {Array} feedbackItems - List of feedback objects { text, sentiment, themes }
 */
function generateInsights(feedbackItems) {
    if (!feedbackItems || feedbackItems.length === 0) return "No sufficient data to generate insights.";

    let pos = 0, neg = 0, neu = 0;
    const topics = {
        positive: {},
        negative: {}
    };

    // Keyword mapping for topics
    const topicKeywords = {
        'Service Speed': ['lambat', 'lama', 'antri', 'cepat', 'sigap'],
        'Staff Attitude': ['ramah', 'sopan', 'jutek', 'sinis', 'senyum', 'sapa', 'salam'],
        'Product Knowledge': ['paham', 'mengerti', 'jelas', 'bingung', 'knowledge'],
        'Store Ambience': ['panas', 'dingin', 'ac', 'gerah', 'sejuk', 'musik', 'bising'],
        'Cleanliness': ['bersih', 'kotor', 'bau', 'sampah', 'debu', 'rapi', 'berantakan'],
        'Stock': ['kosong', 'habis', 'lengkap', 'size', 'stok']
    };

    feedbackItems.forEach(item => {
        if (item.sentiment === 'positive') pos++;
        else if (item.sentiment === 'negative') neg++;
        else neu++;

        const text = (item.text || "").toLowerCase();
        for (const [topic, keys] of Object.entries(topicKeywords)) {
            if (keys.some(k => text.includes(k))) {
                if (item.sentiment === 'positive') topics.positive[topic] = (topics.positive[topic] || 0) + 1;
                else if (item.sentiment === 'negative') topics.negative[topic] = (topics.negative[topic] || 0) + 1;
            }
        }
    });

    const total = pos + neg + neu;
    const posPct = Math.round((pos / total) * 100) || 0;
    const negPct = Math.round((neg / total) * 100) || 0;

    // Get Top Topics
    const getTop = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]);
    const topPos = getTop(topics.positive);
    let topNeg = getTop(topics.negative);

    // Filter out duplicates (if a topic is in both, remove from neg to prioritize positive narrative or distinct issues)
    topNeg = topNeg.filter(t => !topPos.includes(t));

    let narrative = "";

    // 1. Overall Sentiment
    if (posPct >= 80) narrative += `<strong>Exceptional Performance (${posPct}% Positive)</strong>. `;
    else if (posPct >= 60) narrative += `<strong>Strong Performance (${posPct}% Positive)</strong>. `;
    else if (negPct >= 40) narrative += `<strong>Critical Attention Needed (${negPct}% Negative)</strong>. `;
    else narrative += `<strong>Mixed Feedback (${posPct}% Pos / ${negPct}% Neg)</strong>. `;

    // 2. Positive Drivers
    if (topPos.length > 0) {
        narrative += `Customers frequently praise the <strong>${topPos.join(' & ')}</strong>. `;
    }

    // 3. Negative Drivers
    if (topNeg.length > 0) {
        narrative += `However, recurring issues with <strong>${topNeg.join(' & ')}</strong> detail areas for immediate improvement.`;
    } else if (negPct < 10 && total > 5) {
        narrative += `Minimal negative feedback detected.`;
    }

    return narrative;
}

module.exports = { analyzeFeedback, classifySingle, generateInsights };
