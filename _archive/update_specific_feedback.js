
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

const updates = [
    {
        text: 'Area fitting room harus dibersihkan dari sisa noda yang menempel dan Toilet harus menyediakan tempat sampah.',
        topics: ['Store Cleanliness', 'Hygiene'],
        summary: 'Dirty fitting room & missing toilet bin.'
    },
    {
        text: 'Lantai fitting room dalam keadaan kotor dan terdapat bercak hitam di dinding.',
        topics: ['Store Cleanliness', 'Ambiance'],
        summary: 'Dirty fitting room floor & wall stains.'
    },
    {
        text: 'Temperatur suhu di dalam outlet terasa panas.',
        topics: ['Ambiance'],
        summary: 'Store temperature is too hot.'
    },
    {
        text: 'Lampu huruf "A" pada tulisan "TROPICAL" dalam keadaan redup dibanding dengan huruf lainnya.',
        topics: ['Ambiance', 'Facility Maintenance'],
        summary: 'Dim signage lighting (Letter A).'
    },
    {
        text: 'Retail Assistant tidak menghampiri Pelanggan, melainkan Pelanggan yang menghampiri Retail Assistant terlebih dahulu.',
        topics: ['Hospitality', 'Staff Friendliness'],
        summary: 'Passive staff; customer had to approach.'
    },
    {
        text: 'Kasir hanya melngucapkan, "Terima kasih".',
        topics: ['Greeting/Closing'],
        summary: 'Incomplete closing greeting (Only "Thank you").'
    },
    {
        text: 'Kasir mengkonfirmasi jenis produk yang dibeli beserta jumlah itemnya saja, tidak mengkonfirmasi warna dan ukurannya.',
        topics: ['Payment/Checkout', 'Precision'],
        summary: 'Incomplete product confirmation at checkout.'
    },
    {
        text: 'Retail Assistant maupun Kasir tidak meminta Pelanggan mengecek kembali produk yang akan dibeli, melainkan langsung mentransaksikan produk setelah Pelanggan memilih warna.',
        topics: ['Precision', 'Speed of Service'],
        summary: 'Skipped product condition check before transaction.'
    },
    {
        text: 'Kasir tidak mengonfirmasi barang yang dibeli secara lengkap, melainkan hanya mengonfirmasi jumlah item.',
        topics: ['Payment/Checkout', 'Precision'],
        summary: 'Incomplete checkout confirmation (Quantity only).'
    },
    {
        text: 'Retail Assistant tidak bertanya tentang kepemilikan member kepada Pelanggan, melainkan hanya menginformasikan promosi dan garansi yang berlaku.',
        topics: ['Hospitality', 'Membership'],
        summary: 'Staff skipped membership inquiry.'
    }
];

let updatedCount = 0;

updates.forEach(item => {
    cache[item.text] = {
        sentiment: 'negative',
        topics: item.topics,
        aiSummary: item.summary,
        aiInsight: 'Maintain high service standards.',
        isAutoSeeded: false
    };
    updatedCount++;
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`Successfully polished ${updatedCount} items with professional summaries.`);
