module.exports = [
    // --- USER PROVIDED NEGATIVE EXAMPLES ---
    { text: "Retail Assistant tidak bertanya apakah Pelanggan sudah memiliki member Eiger (EAC) atau belum, hanya menjelaskan benefit member ketika Pelanggan menanyakan mengenai promo.", label: "negative" },
    { text: "Retail Assistant tidak memberi tanggapan atau masukan terhadap produk yang dicoba oleh Pelanggan melainkan hanya membantu mengambilkan produk dengan warna lain dan kemudian pergi meninggalkan Pelanggan untuk melanjutkan promo live.", label: "negative" },
    { text: "Retail Assistant tidak menanyakan kepemilikan member, hanya menjelaskan promo dan garansi kerusakan.", label: "negative" },
    { text: "Suhu di lantai 1 terasa nyaman. Namun suhu di lantai 2 cukup hangat karena pada saat Pelanggan naik ke lantai 2, seluruh AC belum dinyalakan.", label: "negative" },
    { text: "Retail Assistant tidak menanyakan apakah Pelanggan sudah memiliki member, hanya menjawab pertanyaan sesuai kebutuhan Pelanggan saja.", label: "negative" },
    { text: "Kasir tidak mengonfirmasikan kembali barang yang dibeli, namun Kasir menyebutkan informasi diskon produk.", label: "negative" },
    { text: "Kasir tidak mengkonfirmasi barang yang akan dibeli secara lengkap, namun hanya mengkonfirmasi jenis produknya saja.", label: "negative" },

    // --- NEW USER BATCH (NEGATIVE) ---
    { text: "Kasir hanya mengucapkan, 'Terima kasih'.", label: "negative" },
    { text: "Warna cat pada fasad terlihat belang.", label: "negative" },
    { text: "Semua produk yang dipajang di rak atau gantungan terdapat price tag, namun ketika mengecek baju pada mannequins tidak terdapat price tag.", label: "negative" },
    { text: "Area fitting room harus dibersihkan dari sisa noda yang menempel dan Toilet harus menyediakan tempat sampah.", label: "negative" },
    { text: "Terdapat satu pot tanaman dengan kondisi cukup layu yang terletak di antara lemari display pada area lantai 2.", label: "negative" },
    { text: "Terlihat tumpukan apparel yang belum dirapikan.", label: "negative" },
    { text: "Dinding bagian atas toilet terlihat kurang terawat.", label: "negative" },
    { text: "Terlihat banyak tumpukan kardus baik di jalur jalan Pelanggan maupun di bawah rak display dan beberapa produk tas tergeletak di lantai store.", label: "negative" },
    { text: "Fitting room bisa digunakan, namun terdapat beberapa bercak tangan pada dindingnya.", label: "negative" },
    { text: "Suhu ruangan di dalam toko terlalu rendah sehingga Pelanggan merasa terlalu dingin.", label: "negative" },
    { text: "Hanya mengucapkan salam, kontak mata dan tersenyum tanpa posisi tangan kanan diletakkan di dada sebelah kiri dan tangan kiri diletakkan di samping saku celana ketika menyambut.", label: "negative" },
    { text: "Pada pintu Fitting Room, ada beberapa bagian kayu yang sudah patah dan rusak. Lalu pada kunci pintu Fitting Room, baut bagian atas sudah tidak ada.", label: "negative" },
    { text: "Banner yang dipajang di luar Store adalah materi promosi sudah tidak berlaku dan kadaluarsa.", label: "negative" },
    { text: "Kasir tidak memakai topi sesuai SOP seragam di hari Sabtu.", label: "negative" },
    { text: "Retail Assistantt terlihat kurang peka saat kedatangan Pelanggan dan seperti sibuk dalam hal yang sedang dikerjakannya sehingga Pelanggan harus menghampiri dan bertanya terlebih dahulu.", label: "negative" },
    { text: "Kasir hanya memproses transaksi pembayaran Pelanggan tanpa menjelaskan cara penukaran produk.", label: "negative" },
    { text: "Retail Assistant hanya tersenyum dan memperhatikan Pelanggan dari jauh.", label: "negative" },
    { text: "Kondisi Store terlihat kurang terawat, terdapat tambalan/dinding yang mengelupas di area display sehingga sangat merusak pemandangan. Selain itu saat melayani Pelanggan Retail Assistant terlihat sedang memperbaiki sesuatu, kemungkinan bagian jendela dalam Store yang ditopang dengan beberapa bilah kayu.", label: "negative" },
    { text: "Terdapat Retail Assistant yang bermain handphone ketika Pelanggan datang.", label: "negative" },
    { text: "Dinding dan langit-langit toko terlihat tambalan pada temboknya, yang dapat mengganggu kenyamanan pandangan Pelanggan.", label: "negative" },

    // --- THIRD USER BATCH (SOP, Hygiene, Competence) ---
    { text: "Staff Trainee tidak melakukan kontak mata saat Pelanggan pertama datang, Staf Trainee hanya melakukan kontak mata ke arah Pelanggan lain yang sedang melakukan pembayaran dengannya.", label: "negative" },
    { text: "Air dalam closet kuning, yang kemungkinan tidak disiram oleh pengguna sebelumnya.", label: "negative" },
    { text: "Jawaban yang diberikan oleh Staff Trainee tidak relevan karena Pelanggan meminta rekomendasi namun Staff Trainee mengatakan bahwa semua produk trekking pole rekomended.", label: "negative" },
    { text: "Retail Assistant hanya menghampiri Pelanggan tanpa meletakan tangan kanan diletakkan di dada sebelah kiri dan tangan kiri diletakkan di samping saku celana.", label: "negative" },
    { text: "Retail Assistant tidak menyambut pelanggan yang baru memasuki outlet dengan ucapan 'Selamat Datang di Eiger.'", label: "negative" },

    // --- SYNTHETIC EXPANSION (Model Training for Similar Cases) ---
    // Expansion 1: Eye Contact & Focus
    { text: "Kasir sibuk dengan mesin dan tidak melihat ke arah pelanggan saat menyerahkan struk.", label: "negative" },
    { text: "Staf berbicara dengan pelanggan namun pandangan matanya ke arah HP.", label: "negative" },
    { text: "Saat saya tanya ukuran, staf menjawab tanpa menoleh sedikitpun.", label: "negative" },

    // Expansion 2: Service Gestures (Tangan di Dada/Courtesy)
    { text: "Salam yang diberikan terasa kaku dan tanpa gestur sopan.", label: "negative" },
    { text: "Staf menyapa hanya dengan gumaman, tangan tetap di saku celana.", label: "negative" },
    { text: "Tidak ada gestur ramah tamah standar Eiger saat melayani.", label: "negative" },

    // Expansion 3: Hygiene & Maintenance (Specific Details)
    { text: "Lantai toilet basah dan ada jejak sepatu kotor.", label: "negative" },
    { text: "Wastafel mampet dan airnya meluap keluar.", label: "negative" },
    { text: "Cermin di fitting room buram dan banyak sidik jari.", label: "negative" },
    { text: "Gagang pintu toko terasa lengket dan kotor.", label: "negative" },

    // Expansion 4: Product Knowledge & Helpfulness
    { text: "Saya tanya bedanya tas A dan B, staf cuma bilang 'sama bagusnya' tanpa penjelasan.", label: "negative" },
    { text: "Penjelasan staf berbelit-belit dan tidak menjawab pertanyaan saya.", label: "negative" },
    { text: "Staf terlihat bingung dan harus baca tag harga dulu saat ditanya bahan produk.", label: "negative" },

    // Expansion 5: Greetings & Standard Phrases
    { text: "Saya keluar toko dan staf diam saja tanpa ucapan terima kasih.", label: "negative" },
    { text: "Masuk toko seperti masuk hutan, sepi tidak ada yang menyapa.", label: "negative" },
    { text: "Hanya mengangguk saat saya bayar, tidak ada ucapan formal.", label: "negative" },

    // --- SECOND USER BATCH ---
    { text: "Awalnya Pelanggan menanyakan tentang Trekking Pole ke Retail Assistant wanita, sampai ditempat Trekking Pole ada Retail Assistant pria yang sedang live di sosial media lalu menjelaskan tentang Trekking Pole ke Pelanggan.", label: "neutral" },
    { text: "Kasir mengucapkan terima kasih sambil memberikan barang yang Pelanggan beli, lalu kembali sibuk dengan pekerjaanya tanpa melakukan gestur salam penutup terlebih dahulu.", label: "negative" },
    { text: "Trainee dan Kasir tidak mengucapkan salam Penutup melainkan hanya melakukan gestur salam Penutup sambil tersenyum dan berkata 'Iya' saat Pelanggan berterima kasih.", label: "negative" },
    { text: "Kasir lupa mencabut pin pengaman pada helm yang sudah dibayar oleh Pelanggan lain, sehingga alat pengaman berbunyi saat Pelanggan tersebut keluar dari toko.", label: "negative" },
    { text: "Pelanggan mengucapkan terima kasih kemudian Retail Assistant dan kasir mengucapkan terima kasih kembali tanpa ada pernyataan ditunggu kedatangannya kembali.", label: "negative" },
    { text: "Di meja kasir hanya terdapat POP Acrylic untuk promo diskon bank saja.", label: "negative" },

    // --- BASELINE NEUTRAL (For Balance) ---
    { text: "Toko sedang ramai pengunjung saat Pelanggan datang.", label: "neutral" },
    { text: "Pelanggan hanya melihat-lihat produk tanpa membeli apa pun.", label: "neutral" },
    { text: "Staf sedang menata barang di rak saat Pelanggan lewat.", label: "neutral" },
    { text: "Lampu di area belakang terlihat redup dibanding area depan.", label: "neutral" },
    { text: "Untuk pelayanan Retail Assistant dan Kasir sudah baik, namun ketika Pelanggan sedang melihat-lihat produk Retail Assistant beberapa kali sekaligus melayani Pelanggan lain.", label: "neutral" },
    { text: "Waktu yang dibutuhkan Kasir untuk menyelesaikan transaksi pembayaran adalah 5 menit.", label: "neutral" },
    { text: "Lama waktu yang dibutuhkan Kasir untuk menyelesaikan transaksi pembayaran adalah 4 Menit.", label: "neutral" },

    // --- HARVESTED REAL EXAMPLES (AUTO-GENERATED) ---
    { text: "Store Eiger Purwokerto dalam keadaan bersih, untuk pelayanan dari Retail Assistant cukup baik. Namun untuk toiletnya terlihat kotor.", label: "negative" },
    { text: "Retail Assistant terkesan sangat pasif dalam berkomunikasi dan tidak mencoba aktif memberikan informasi.", label: "negative" },
    // Note: 'mixed' logic isn't explicit yet, treating as negative/constructive for now unless I add 'mixed' class. 
    // I'll stick to 'negative' for constructive criticism or 'neutral' if balanced.
    // Let's use 'negative' for "agar ditingkatkan".
    { text: "Outlet Eiger Pengayoman Makassar agar ditingkatkan lagi kebersihannya namun untuk kerapihan sudah cukup baik.", label: "negative" },

    { text: "Area Fitting Room mesti dilakukan perbaikan pada sisi dinding yang bolong dan cat yang mengelupas.", label: "negative" },
    { text: "Pemasangan Spanduk agar dapat diperhatikan kembali karena bisa merusak tampilan/Estetika.", label: "negative" },
    { text: "Fasade seperti masih old look.", label: "negative" },
    { text: "Toilet terlihat minim perawatan.", label: "negative" },

    // --- SYNTHETIC EXPANSION (COMMON PATTERNS) ---
    { text: "Mohon untuk kebersihan toilet lebih dijaga lagi karena agak bau.", label: "negative" },
    { text: "Pelayanan sudah bagus, tapi antrian di kasir sangat panjang dan lama.", label: "negative" },
    { text: "Staf ramah tapi sayang stok barang yang saya cari kosong terus.", label: "negative" },
    { text: "Musik di dalam toko terlalu kencang, jadi susah ngobrol sama staf.", label: "negative" },
    { text: "AC kurang dingin, padahal cuaca di luar sangat panas.", label: "negative" },
    { text: "Display sepatu berantakan dan banyak debu.", label: "negative" },
    { text: "Saya tanya promo tapi kasir kurang paham dan harus tanya senior dulu.", label: "negative" },
    { text: "Security di depan kurang ramah menyapa pelanggan.", label: "negative" },

    // --- BASELINE NEGATIVE EXAMPLES (Common Issues) ---
    { text: "Pelayanan sangat lambat dan kasir tidak ramah.", label: "negative" },
    { text: "Toko kotor dan banyak debu di rak produk.", label: "negative" },
    { text: "AC mati sehingga udara di dalam toko sangat panas.", label: "negative" },
    { text: "Staf asyik mengobrol sendiri dan tidak melayani pelanggan.", label: "negative" },
    { text: "Produk tidak lengkap dan size yang dicari tidak ada.", label: "negative" },
    { text: "Fitting room bau dan kotor.", label: "negative" },
    { text: "Toilet tidak bersih dan tidak ada tisu.", label: "negative" },
    { text: "Kasir salah input harga dan prosesnya lama.", label: "negative" },
    { text: "Retail Assistant tidak paham product knowledge.", label: "negative" },
    { text: "Tidak ada salam sambutan saat masuk toko.", label: "negative" },
    { text: "Saya sangat kecewa dengan pelayanan di sini.", label: "negative" }, // Added
    { text: "Pengalaman belanja yang buruk dan mengecewakan.", label: "negative" }, // Added
    { text: "Kualitas barang jelek dan rusak.", label: "negative" }, // Added

    // --- BASELINE POSITIVE EXAMPLES (For Balance) ---
    { text: "Pelayanan sangat memuaskan, staf ramah dan membantu.", label: "positive" },
    { text: "Toko sangat bersih, wangi, dan dingin.", label: "positive" },
    { text: "Retail Assistant sangat informatif menjelaskan fitur produk.", label: "positive" },
    { text: "Proses pembayaran di kasir cepat dan mudah.", label: "positive" },
    { text: "Koleksi produk lengkap dan display rapi.", label: "positive" },
    { text: "Sangat direkomendasikan belanja di sini, pengalaman menyenangkan.", label: "positive" },
    { text: "Fitting room bersih dan nyaman digunakan.", label: "positive" },
    { text: "Staf sigap membantu mencarikan ukuran yang pas.", label: "positive" },
    { text: "Suasana toko tenang dan musiknya enak didengar.", label: "positive" },
    { text: "Kasir menjelaskan promo dengan sangat jelas dan detail.", label: "positive" },
    { text: "Terima kasih atas pelayanan yang luar biasa.", label: "positive" },
    { text: "Semua staf menyapa dengan hangat dan sopan.", label: "positive" }
];
