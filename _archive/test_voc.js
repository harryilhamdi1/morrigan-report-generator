const { classifySingle } = require('./src/modules/voc.js');

const testCases = [
    // Latest Neutral Cases from User
    { text: "Untuk pelayanan Retail Assistant dan Kasir sudah baik, namun ketika Pelanggan sedang melihat-lihat produk Retail Assistant beberapa kali sekaligus melayani Pelanggan lain.", expected: "neutral" },
    { text: "Waktu yang dibutuhkan Kasir untuk menyelesaikan transaksi pembayaran adalah 5 menit.", expected: "neutral" },
    { text: "Lama waktu yang dibutuhkan Kasir untuk menyelesaikan transaksi pembayaran adalah 4 Menit.", expected: "neutral" },

    // Previous Neutral Cases
    { text: "Awalnya Pelanggan menanyakan tentang Trekking Pole ke Retail Assistant wanita, sampai ditempat Trekking Pole ada Retail Assistant pria yang sedang live di sosial media lalu menjelaskan tentang Trekking Pole ke Pelanggan.", expected: "neutral" },

    // Negative Case (New Batch)
    { text: "Kasir mengucapkan terima kasih sambil memberikan barang yang Pelanggan beli, lalu kembali sibuk dengan pekerjaanya tanpa melakukan gestur salam penutup terlebih dahulu.", expected: "negative" },
    { text: "Trainee dan Kasir tidak mengucapkan salam Penutup melainkan hanya melakukan gestur salam Penutup sambil tersenyum dan berkata 'Iya' saat Pelanggan berterima kasih.", expected: "negative" },

    // New User Request Cases
    { text: "Hanya mengucapkan salam, kontak mata dan tersenyum tanpa posisi tangan kanan diletakkan di dada sebelah kiri dan tangan kiri diletakkan di samping saku celana ketika menyambut.", expected: "negative" },
    { text: "Pada pintu Fitting Room, ada beberapa bagian kayu yang sudah patah dan rusak. Lalu pada kunci pintu Fitting Room, baut bagian atas sudah tidak ada.", expected: "negative" },
    { text: "Banner yang dipajang di luar Store adalah materi promosi sudah tidak berlaku dan kadaluarsa.", expected: "negative" },
    { text: "Kasir tidak memakai topi sesuai SOP seragam di hari Sabtu.", expected: "negative" },
    { text: "Retail Assistantt terlihat kurang peka saat kedatangan Pelanggan dan seperti sibuk dalam hal yang sedang dikerjakannya sehingga Pelanggan harus menghampiri dan bertanya terlebih dahulu.", expected: "negative" },
    { text: "Kasir hanya memproses transaksi pembayaran Pelanggan tanpa menjelaskan cara penukaran produk.", expected: "negative" },
    { text: "Kondisi Store terlihat kurang terawat, terdapat tambalan/dinding yang mengelupas di area display sehingga sangat merusak pemandangan.", expected: "negative" },
    { text: "Terdapat Retail Assistant yang bermain handphone ketika Pelanggan datang.", expected: "negative" },
    { text: "Retail Assistant hanya tersenyum dan memperhatikan Pelanggan dari jauh.", expected: "negative" },
    { text: "Dinding dan langit-langit toko terlihat tambalan pada temboknya, yang dapat mengganggu kenyamanan pandangan Pelanggan.", expected: "negative" },

    // --- BATCH 3: SOP, Hygiene, Competence (Expanded Model Test) ---
    { text: "Staff Trainee tidak melakukan kontak mata saat Pelanggan pertama datang, Staf Trainee hanya melakukan kontak mata ke arah Pelanggan lain yang sedang melakukan pembayaran dengannya.", expected: "negative" },
    { text: "Air dalam closet kuning, yang kemungkinan tidak disiram oleh pengguna sebelumnya.", expected: "negative" },
    { text: "Jawaban yang diberikan oleh Staff Trainee tidak relevan karena Pelanggan meminta rekomendasi namun Staff Trainee mengatakan bahwa semua produk trekking pole rekomended.", expected: "negative" },
    { text: "Retail Assistant hanya menghampiri Pelanggan tanpa meletakan tangan kanan diletakkan di dada sebelah kiri dan tangan kiri diletakkan di samping saku celana.", expected: "negative" },
    { text: "Retail Assistant tidak menyambut pelanggan yang baru memasuki outlet dengan ucapan 'Selamat Datang di Eiger.'", expected: "negative" },

    // Synthetic Tests (Generalization Check)
    { text: "Kasir sibuk dengan mesin dan tidak melihat ke arah pelanggan saat menyerahkan struk.", expected: "negative" },
    { text: "Lantai toilet basah dan ada jejak sepatu kotor.", expected: "negative" },
    { text: "Tidak ada gestur ramah tamah standar Eiger saat melayani.", expected: "negative" }
];

console.log("--- VoC 3-Class Sentiment Test (DEBUG MODE) ---");
testCases.forEach((test, i) => {
    const result = classifySingle(test.text);
    const status = result.sentiment === test.expected ? "✅" : "❌";
    console.log(`[${i + 1}] ${status} | Predicted: ${result.sentiment.toUpperCase()} | Expected: ${test.expected.toUpperCase()}`);
    console.log(`    Text: "${test.text.substring(0, 60)}..."`);
    console.log(`    ML Scores:`, JSON.stringify(result.mlScores));
    console.log(`    Confidence:`, result.confidence.toFixed(4));
    console.log(`    Net Rule Score:`, result.netScore);
    console.log("-----------------------------------------");
});
