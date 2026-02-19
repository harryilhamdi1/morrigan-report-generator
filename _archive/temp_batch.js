const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

const batch = {
    "Retail Assistant tidak menawarkan Pelanggan untuk mencoba produk, namun hanya menginformasikan tempat mencoba produk yang diminta.": {
        "sentiment": "negative",
        "topics": ["Hospitality"],
        "aiSummary": "Staff didn't offer trial; only pointed to fitting room.",
        "aiInsight": "Trial Suggestion: Staff should actively encourage customers to try items to drive conversion."
    },
    "Retail Assistant mengenakan jilbab yang dikeluarkan dari kerah baju. Pelanggan disambut oleh Security yang berjaga di area pintu masuk.": {
        "sentiment": "negative",
        "topics": ["Staffing", "Greeting/Closing"],
        "aiSummary": "Grooming violation (Hijab) despite good security greeting.",
        "aiInsight": "Grooming SOP: Ensure all floor staff follow uniform protocols strictly (jilbab in collar)."
    },
    "Pintu fitting room sulit dikunci karena baut pada kunci pintu kendor.": {
        "sentiment": "negative",
        "topics": ["Facility Maintenance"],
        "aiSummary": "Loose bolt on fitting room door lock.",
        "aiInsight": "Facility Repair: Tighten/replace fitting room locks to ensure customer privacy and safety."
    },
    "Terdapat lampu yang padam pada area tengah store.": {
        "sentiment": "negative",
        "topics": ["Facility Maintenance", "Ambiance"],
        "aiSummary": "Dead bulb in central sales area.",
        "aiInsight": "Maintenance check: Replace dead bulbs immediately to maintain a premium shopping environment."
    },
    "Retail Assistant fokus merapikan produk yang berada di sales floor, Retail Assistant tidak menanyakan kebutuhan Pelanggan.": {
        "sentiment": "negative",
        "topics": ["Hospitality", "Staff Friendliness"],
        "aiSummary": "Staff busy merchandising, ignored customer needs.",
        "aiInsight": "Customer Priority: Service takes precedence over merchandising; staff must stop and engage immediately."
    },
    "Retail Assistant hanya menginformasikan barang ready dan tidak menjelaskan keunggulan produk.": {
        "sentiment": "negative",
        "topics": ["Product Quality", "Staff Friendliness"],
        "aiSummary": "Transactional service: no product USP explanation.",
        "aiInsight": "Value-Add: Staff must be trained to share product stories/tech specs to justify premium pricing."
    },
    "Retail Assistant tidak menawarkan Pelanggan untuk mencoba produk yang diminati.": {
        "sentiment": "negative",
        "topics": ["Hospitality"],
        "aiSummary": "No product trial offer.",
        "aiInsight": "Proactive Service: Help customers feel the product fit by offering trials immediately."
    },
    "Terdapat 2 jumlah Retail Assistant yang sedang bertugas di dalam toko.": {
        "sentiment": "neutral",
        "topics": ["Staffing"],
        "aiSummary": "Staffing count: 2 RA.",
        "aiInsight": "Zoning Check: Ensure 2 staff can cover both entrance and fitting areas during peak."
    },
    "Terdapat 8 pelanggan yang terdapat di dalam toko.": {
        "sentiment": "neutral",
        "topics": ["Staffing"],
        "aiSummary": "Traffic: 8 customers present.",
        "aiInsight": "Service Ratio: Monitor if 2 staff (from previous entry) can handle 8 customers simultaneously."
    },
    "Toilet tergabung dengan gudang karena berada di lantai 3.": {
        "sentiment": "neutral",
        "topics": ["Ambiance"],
        "aiSummary": "Toilet/Storage integrated on Floor 3.",
        "aiInsight": "Space Optimization: Maintain clear segregation between guest facilities and stock areas."
    },
    "Retail Assistant tidak melakukan salam penutup.": {
        "sentiment": "negative",
        "topics": ["Greeting/Closing"],
        "aiSummary": "Missing closing greeting.",
        "aiInsight": "Retention SOP: Every customer leaving must be thanked and invited back using the brand script."
    },
    "Saat melakukan pembayaran / penukaran produk, kasir hanya fokus melayani pembayaran.": {
        "sentiment": "negative",
        "topics": ["Hospitality", "Payment/Checkout"],
        "aiSummary": "Cashier only focused on payment, no hospitality.",
        "aiInsight": "Service Excellence: Cashier should maintain eye contact and conversation, not just process cash."
    },
    "Terdapat sampah tissue pada lantai fitting room.": {
        "sentiment": "negative",
        "topics": ["Store Cleanliness"],
        "aiSummary": "Debris on fitting room floor.",
        "aiInsight": "Cleaning Checklist: Fitting rooms should be checked every 30 minutes for litter/forgotten items."
    },
    "Retail Assistant tidak memberikan masukan yang relevan terhadap produk yang dicoba, melainkan hanya menunggu Pelanggan di luar fitting room.": {
        "sentiment": "negative",
        "topics": ["Hospitality", "Staff Friendliness"],
        "aiSummary": "Reactive service at fitting area.",
        "aiInsight": "Expert Opinion: Staff should provide feedback on fit/style to assist the decision-making process."
    },
    "Retail Assistant tidak menjelaskan cara perawatan produk kepada Pelanggan. Retail Assistant hanya menjelaskan terkait garansi produk.": {
        "sentiment": "negative",
        "topics": ["Product Quality"],
        "aiSummary": "No care instructions provided.",
        "aiInsight": "User Experience: Proper care (washing/storing) extends product life; staff must always mention it."
    }
};

Object.assign(cache, batch);
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log('Batch update complete.');
