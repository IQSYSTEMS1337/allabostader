const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'market-data.json');
const REPORT_PATH = path.join(__dirname, 'top-deals.json');

function generateTopList() {
    console.log("📊 ANALYZING MARKET DATA FOR TOP DEALS...");
    
    if (!fs.existsSync(DB_PATH)) return console.log("❌ NO DATA FOUND.");
    
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    // 1. Filtrera fram objekt med prissänkningar (pc) och som inte är sålda
    let deals = data.filter(h => h.pc && h.t !== '💰 SÅLD' && h.p > 0);
    
    // 2. Sortera efter störst procentuell prissänkning
    deals.sort((a, b) => b.pc - a.pc);
    
    // 3. Välj de 5 tyngsta klippen
    const top5 = deals.slice(0, 5).map(h => ({
        address: h.a,
        url: h.u,
        oldPrice: Math.round(h.p / (1 - (h.pc / 100))),
        newPrice: h.p,
        savings: Math.round((h.p / (1 - (h.pc / 100))) - h.p),
        drop: h.pc,
        source: h.s
    }));

    fs.writeFileSync(REPORT_PATH, JSON.stringify(top5, null, 2));
    console.log(`✅ TOP 5 DEALS GENERATED IN ${REPORT_PATH}`);
}

generateTopList();
